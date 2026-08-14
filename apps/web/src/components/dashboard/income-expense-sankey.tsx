import {
  type ChartFocusStrategy,
  type ChartPoint,
  defineChart,
  link,
  rect,
  text,
} from "@tanstack/charts";
import {
  type SankeyLink,
  type SankeyNode,
  sankeyDiagram,
} from "@tanstack/charts/network/sankey";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { getColorFromCategoryId } from "@/lib/chart-colors";
import { formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import type { DashboardSankeyData } from "../../../../server/src/routers";

const INCOME_COLOR = "var(--income)";
const SAVED_COLOR = "var(--savings)";
const EXPENSES_NODE_COLOR = "var(--expense)";

const NODE_MARK_ID = "sankey-nodes";
const LINK_MARK_ID = "sankey-links";

const NODE_WIDTH = 10;
const LABEL_MARGIN = 150;
const LINK_HIT_DISTANCE = 8;

interface SankeyNodeRow {
  id: string;
  label: string;
  color: string;
  /** Kept only to reproduce the original ordering; the layout derives values from links. */
  value?: number;
}

interface SankeyLinkRow {
  id: string;
  source: string;
  target: string;
  value: number;
  color: string;
}

type SankeyLayoutNode = SankeyNode<SankeyNodeRow, SankeyLinkRow, string>;
type SankeyLayoutLink = SankeyLink<SankeyNodeRow, SankeyLinkRow, string>;
type SankeyDatum = SankeyLayoutNode | SankeyLayoutLink;
type SankeyPoint = ChartPoint<SankeyDatum, number, number>;

// Focus groups every point that shares the same layout row, so hovering a
// node bar or one of its labels keeps the whole node (and its labels) lit.
const sankeyFocusStrategy: ChartFocusStrategy<SankeyDatum, number, number> = {
  resolve(points, { x, y, maxDistance }) {
    // Stage 1: node bars contain the pointer (topmost geometry first).
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const point = points[index];
      if (point.markId !== NODE_MARK_ID) continue;
      const x1 = point.x1Value as number;
      const x2 = point.x2Value as number;
      const y1 = point.y1Value as number;
      const y2 = point.y2Value as number;
      if (
        x1 === undefined ||
        x2 === undefined ||
        y1 === undefined ||
        y2 === undefined
      ) {
        continue;
      }
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      if (x >= left && x <= right && y >= top && y <= bottom) {
        return groupByDatum(points, point);
      }
    }

    // Stage 2: ribbons within a small tolerance of the pointer.
    let closestLink: SankeyPoint | null = null;
    let closestDistance = LINK_HIT_DISTANCE;
    for (const point of points) {
      if (point.markId !== LINK_MARK_ID) continue;
      const distance = distanceToSegment(
        x,
        y,
        point.x1Value as number,
        point.y1Value as number,
        point.x2Value as number,
        point.y2Value as number,
      );
      if (distance <= closestDistance) {
        closestLink = point;
        closestDistance = distance;
      }
    }
    if (closestLink) {
      return groupByDatum(points, closestLink);
    }

    // Stage 3: nearest point (labels included) within maxDistance.
    let nearest: SankeyPoint | null = null;
    let nearestSquared = maxDistance * maxDistance;
    for (const point of points) {
      const dx = point.x - x;
      const dy = point.y - y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= nearestSquared) {
        nearest = point;
        nearestSquared = distanceSquared;
      }
    }
    return nearest ? groupByDatum(points, nearest) : [];
  },
  group(points, { point }) {
    return groupByDatum(points, point);
  },
  navigation(points) {
    const sorted = [...points].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    );
    const seen = new Set<SankeyDatum>();
    const unique: SankeyPoint[] = [];
    for (const point of sorted) {
      if (seen.has(point.datum)) continue;
      seen.add(point.datum);
      unique.push(point);
    }
    return unique;
  },
};

function groupByDatum(points: readonly SankeyPoint[], primary: SankeyPoint) {
  return [
    primary,
    ...points.filter(
      (point) => point !== primary && point.datum === primary.datum,
    ),
  ];
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  if (
    x1 === undefined ||
    y1 === undefined ||
    x2 === undefined ||
    y2 === undefined
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared),
  );
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function buildSankeyGraph(data: DashboardSankeyData): {
  nodes: SankeyNodeRow[];
  links: SankeyLinkRow[];
} {
  const nodeMap = new Map<string, SankeyNodeRow>();
  const linkMap = new Map<string, SankeyLinkRow>();

  const sortedExpenses = [...data.expensesByCategory].sort(
    (a, b) => b.amount - a.amount,
  );

  // Level 0: Income node
  nodeMap.set("income", {
    id: "income",
    label: "Income",
    color: INCOME_COLOR,
    value: data.totalIncome,
  });

  // Level 1: Saved and Expenses nodes (both connect from Income)
  if (data.savedAmount > 0) {
    nodeMap.set("saved", {
      id: "saved",
      label: "Saved",
      color: SAVED_COLOR,
      value: data.savedAmount,
    });
    linkMap.set("income->saved", {
      id: "income->saved",
      source: "income",
      target: "saved",
      value: data.savedAmount,
      color: SAVED_COLOR,
    });
  }

  if (data.totalExpenses > 0) {
    nodeMap.set("expenses", {
      id: "expenses",
      label: "Expenses",
      color: EXPENSES_NODE_COLOR,
      value: data.totalExpenses,
    });
    linkMap.set("income->expenses", {
      id: "income->expenses",
      source: "income",
      target: "expenses",
      value: data.totalExpenses,
      color: EXPENSES_NODE_COLOR,
    });
  }

  // Separate expenses into those with parents and those without
  const expensesWithParent = sortedExpenses.filter(
    (e) => e.category.parentCategory,
  );

  // Track parent totals for expenses that have parents
  const parentTotals = new Map<
    string,
    { id: string; name: string; amount: number }
  >();

  for (const expense of expensesWithParent) {
    const parent = expense.category.parentCategory;
    if (!parent) continue;
    const existing = parentTotals.get(parent.id);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      parentTotals.set(parent.id, {
        id: parent.id,
        name: parent.name,
        amount: expense.amount,
      });
    }
  }

  // For standalone categories, exclude any that are already parent categories
  // (to prevent duplication when a category has both direct expenses AND child categories)
  const expensesWithoutParent = sortedExpenses.filter(
    (e) => !e.category.parentCategory && !parentTotals.has(e.category.id),
  );

  // Also need to check if any standalone category IS a parent of another expense
  // and if so, merge its amount into the parent total
  const standaloneThatAreParents = sortedExpenses.filter(
    (e) => !e.category.parentCategory && parentTotals.has(e.category.id),
  );

  // Merge standalone parent-category amounts into parent totals
  for (const expense of standaloneThatAreParents) {
    const parentEntry = parentTotals.get(expense.category.id);
    if (parentEntry) {
      parentEntry.amount += expense.amount;
    }
  }

  // Level 2: Parent category nodes (connect from Expenses)
  for (const [, parent] of parentTotals) {
    const parentNodeId = `parent-${parent.id}`;
    nodeMap.set(parentNodeId, {
      id: parentNodeId,
      label: parent.name,
      color: getColorFromCategoryId(parent.id),
      value: parent.amount,
    });
    linkMap.set(`expenses->${parentNodeId}`, {
      id: `expenses->${parentNodeId}`,
      source: "expenses",
      target: parentNodeId,
      value: parent.amount,
      color: EXPENSES_NODE_COLOR,
    });
  }

  // Level 3: Child categories (connect from their parent)
  for (const expense of expensesWithParent) {
    const parent = expense.category.parentCategory;
    if (!parent) continue;
    const parentNodeId = `parent-${parent.id}`;
    const childNodeId = `child-${expense.category.id}`;

    if (!nodeMap.has(childNodeId)) {
      nodeMap.set(childNodeId, {
        id: childNodeId,
        label: expense.category.name, // Just the category name, not full path
        color: getColorFromCategoryId(expense.category.id),
      });
    }

    const linkId = `${parentNodeId}->${childNodeId}`;
    const existingLink = linkMap.get(linkId);
    if (existingLink) {
      existingLink.value += expense.amount;
    } else {
      linkMap.set(linkId, {
        id: linkId,
        source: parentNodeId,
        target: childNodeId,
        value: expense.amount,
        color: getColorFromCategoryId(expense.category.id),
      });
    }
  }

  // When some spend is categorized on the parent (not a subcategory), it is
  // included in parentTotals but has no parent→child link. Add a "direct"
  // branch so flows sum and the layout places ribbons correctly.
  const FLOW_EPSILON = 0.005;
  for (const [, parent] of parentTotals) {
    const parentNodeId = `parent-${parent.id}`;
    let childrenSum = 0;
    for (const link of linkMap.values()) {
      if (link.source === parentNodeId) {
        childrenSum += link.value;
      }
    }
    const remainder = parent.amount - childrenSum;
    if (remainder <= FLOW_EPSILON) continue;

    const directChildId = `child-direct-${parent.id}`;
    if (!nodeMap.has(directChildId)) {
      nodeMap.set(directChildId, {
        id: directChildId,
        label: `${parent.name} (direct)`,
        color: getColorFromCategoryId(parent.id),
      });
    }
    linkMap.set(`${parentNodeId}->${directChildId}`, {
      id: `${parentNodeId}->${directChildId}`,
      source: parentNodeId,
      target: directChildId,
      value: remainder,
      color: getColorFromCategoryId(parent.id),
    });
  }

  // Level 2/3: Categories without parents (connect directly from Expenses)
  for (const expense of expensesWithoutParent) {
    const nodeId = `category-${expense.category.id}`;

    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        label: expense.category.name,
        color: getColorFromCategoryId(expense.category.id),
      });
    }

    const linkId = `expenses->${nodeId}`;
    const existingLink = linkMap.get(linkId);
    if (existingLink) {
      existingLink.value += expense.amount;
    } else {
      linkMap.set(linkId, {
        id: linkId,
        source: "expenses",
        target: nodeId,
        value: expense.amount,
        color: getColorFromCategoryId(expense.category.id),
      });
    }
  }

  const rawNodes = Array.from(nodeMap.values());
  const rawLinks = Array.from(linkMap.values());

  // Reproduce the original ordering: by incoming source value, then own value.
  const getParentValue = (nodeId: string): number => {
    for (const link of rawLinks) {
      if (link.target === nodeId) {
        const sourceNode = rawNodes.find((node) => node.id === link.source);
        return sourceNode?.value ?? 0;
      }
    }
    return 0;
  };

  rawNodes.sort((a, b) => {
    const aParentVal = getParentValue(a.id);
    const bParentVal = getParentValue(b.id);
    if (aParentVal !== bParentVal) return bParentVal - aParentVal;
    return (b.value ?? 0) - (a.value ?? 0);
  });

  return { nodes: rawNodes, links: rawLinks };
}

export function IncomeExpenseSankey({ data }: { data: DashboardSankeyData }) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;
  const [focusedPoint, setFocusedPoint] = useState<SankeyPoint | null>(null);

  // Handle node click to navigate to transactions with filter
  const handleNodeClick = (nodeId: string) => {
    let categoryId: string | null = null;

    if (nodeId.startsWith("parent-")) {
      categoryId = nodeId.replace("parent-", "");
    } else if (nodeId.startsWith("child-direct-")) {
      categoryId = nodeId.replace("child-direct-", "");
    } else if (nodeId.startsWith("child-")) {
      categoryId = nodeId.replace("child-", "");
    } else if (nodeId.startsWith("category-")) {
      categoryId = nodeId.replace("category-", "");
    }

    if (categoryId) {
      navigate({
        to: "/transactions",
        search: { category: categoryId, page: 1 },
      });
    }
  };

  const handleSelect = (point: SankeyPoint | null) => {
    const datum = point?.datum;
    if (datum && datum.kind === "node") {
      handleNodeClick(datum.data.id);
    }
  };

  const { nodes, links } = useMemo(() => buildSankeyGraph(data), [data]);

  const dimensions = useMemo(() => {
    const numNodes = nodes.length;
    // Base height + additional height per node to prevent overcrowding
    const baseWidth = 550;
    const baseHeight = 240;
    const minNodeHeight = 8; // Minimum space each node needs
    const requiredHeight = Math.max(baseHeight, numNodes * minNodeHeight);
    // Add extra width for many nodes to spread out the columns
    const requiredWidth = baseWidth + Math.max(0, (numNodes - 15) * 20);
    const nodePadding = Math.max(6, 12 - Math.max(0, numNodes - 8));
    return {
      width: requiredWidth + LABEL_MARGIN * 2,
      height: requiredHeight + 24,
      plotWidth: requiredWidth,
      nodePadding,
    };
  }, [nodes]);

  const definition = useMemo(() => {
    const colorById = new Map(nodes.map((node) => [node.id, node.color]));
    const gradients = links.map((link) => ({
      id: `link-gradient-${link.id}`,
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0,
      stops: [
        { offset: 0, color: colorById.get(link.source) ?? link.color },
        { offset: 1, color: link.color },
      ],
    }));

    const labelSide = (node: SankeyLayoutNode) =>
      node.x < dimensions.plotWidth / 2 ? ("start" as const) : ("end" as const);
    const labelOffset = (node: SankeyLayoutNode) =>
      node.x < dimensions.plotWidth / 2
        ? NODE_WIDTH / 2 + 6
        : -(NODE_WIDTH / 2 + 6);

    return defineChart({
      guides: false,
      focusRing: false,
      focus: sankeyFocusStrategy,
      margin: {
        left: LABEL_MARGIN,
        right: LABEL_MARGIN,
        top: 12,
        bottom: 12,
      },
      color: {
        domain: nodes.map((node) => node.id),
        range: nodes.map((node) => node.color),
      },
      gradients,
      marks: [
        sankeyDiagram({
          nodes,
          links,
          nodeKey: "id",
          source: "source",
          target: "target",
          value: "value",
          linkKey: "id",
          align: "left",
          nodeWidth: NODE_WIDTH,
          nodePadding: dimensions.nodePadding,
          nodeSort: null,
          inset: 10,
          marks: ({ nodes: layoutNodes, links: layoutLinks }) =>
            [
              link(layoutLinks, {
                id: LINK_MARK_ID,
                x1: "x1",
                y1: "y1",
                x2: "x2",
                y2: "y2",
                key: "key",
                stroke: (flow) => `url(#link-gradient-${flow.key})`,
                strokeWidth: (flow) => Math.max(1, flow.width),
                strokeOpacity: (flow) => {
                  const isFocused = focusedPoint?.datum === flow;
                  const isDimmed = focusedPoint !== null && !isFocused;
                  return isDimmed ? 0.1 : isFocused ? 0.7 : 0.4;
                },
                lineCap: "butt",
              }),
              rect(layoutNodes, {
                id: NODE_MARK_ID,
                x1: "x0",
                x2: "x1",
                y1: "y0",
                y2: "y1",
                key: "key",
                color: (node) => node.key,
                radius: 2,
                states: [
                  {
                    when: { focus: "primary" },
                    style: { stroke: "#000", strokeWidth: 2 },
                  },
                  { when: { focus: "unmatched" }, style: { opacity: 0.3 } },
                ],
              }),
              text(layoutNodes, {
                id: "sankey-labels",
                x: (node) => node.x,
                y: (node) => node.y,
                text: (node) => node.data.label,
                key: (node) => `${node.key}:label`,
                anchor: labelSide,
                dx: labelOffset,
                fill: "var(--foreground)",
                fontSize: 10,
                fontWeight: 500,
                states: [
                  { when: { focus: "unmatched" }, style: { opacity: 0.3 } },
                ],
              }),
              text(layoutNodes, {
                id: "sankey-amounts",
                x: (node) => node.x,
                y: (node) => node.y + 8,
                text: (node) =>
                  formatValueWithPrivacy(
                    formatCurrency(node.value),
                    isPrivacyMode,
                  ),
                key: (node) => `${node.key}:amount`,
                anchor: labelSide,
                dx: labelOffset,
                fill: "var(--muted-foreground)",
                fontSize: 10,
                states: [
                  { when: { focus: "unmatched" }, style: { opacity: 0.3 } },
                ],
              }),
            ] as const,
        }),
      ],
      tooltip: {
        use: tooltip,
        content: (points) => {
          const point = points[0];
          if (!point) return { rows: [] };
          const row = point.datum as SankeyDatum;
          if (row.kind === "node") {
            const isExpenseSide =
              row.data.id === "expenses" ||
              row.data.id.startsWith("parent-") ||
              row.data.id.startsWith("child-") ||
              row.data.id.startsWith("category-");
            const percentDenom = isExpenseSide
              ? data.totalExpenses
              : data.totalIncome;
            const amountText = formatCurrency(row.value);
            const pctText = `${((row.value / (percentDenom || 1)) * 100).toFixed(1)}%`;
            return {
              title: row.data.label,
              color: row.data.color,
              rows: [
                {
                  label: "Amount",
                  value: formatValueWithPrivacy(
                    amountText,
                    isPrivacyMode,
                  ).toString(),
                },
                {
                  label: "Share",
                  value: formatValueWithPrivacy(
                    pctText,
                    isPrivacyMode,
                  ).toString(),
                },
              ],
            };
          }
          return {
            title: `${row.sourceNode.data.label} → ${row.targetNode.data.label}`,
            color: row.data.color,
            rows: [
              {
                label: "Amount",
                value: formatValueWithPrivacy(
                  formatCurrency(row.value),
                  isPrivacyMode,
                ).toString(),
              },
            ],
          };
        },
      },
    });
  }, [nodes, links, data, isPrivacyMode, focusedPoint, dimensions]);

  if (!data || data.totalIncome === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No income data available to display income flow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nodes.length === 0 || links.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Insufficient data to generate flow chart.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-2 md:p-4">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[400px] w-full md:min-w-[550px]">
            <Chart
              definition={definition}
              width={dimensions.width}
              height={dimensions.height}
              ariaLabel="Income and expense flow diagram"
              ariaDescription="Flow of income into savings and spending categories."
              onFocusChange={(point) =>
                setFocusedPoint((point as SankeyPoint | null) ?? null)
              }
              onSelect={handleSelect}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
