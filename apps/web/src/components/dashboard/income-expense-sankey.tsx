import { useNavigate } from "@tanstack/react-router";
import {
  type SankeyLink as D3SankeyLink,
  type SankeyNode as D3SankeyNode,
  sankey as d3Sankey,
  sankeyLeft,
  sankeyLinkHorizontal,
} from "d3-sankey";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSankeyData } from "../../../../server/src/routers";

const INCOME_COLOR = "#22c55e";
const SAVED_COLOR = "#3b82f6";
const EXPENSES_NODE_COLOR = "#ef4444";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "#f59e0b",
  "#84cc16",
  "#06b6d4",
  "#8b5cf6",
];

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function getColorFromCategoryId(categoryId: string): string {
  const hash = hashString(categoryId);
  return chartColors[hash % chartColors.length];
}

interface SankeyNode {
  id: string;
  label: string;
  color: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
}

interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  color?: string;
  width?: number;
  y0?: number;
  y1?: number;
}

export function IncomeExpenseSankey({ data }: { data: DashboardSankeyData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // Handle node click to navigate to transactions with filter
  const handleNodeClick = (nodeId: string) => {
    let categoryId: string | null = null;

    if (nodeId.startsWith("parent-")) {
      categoryId = nodeId.replace("parent-", "");
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

  const {
    nodes,
    links,
    width,
    height,
  }: {
    nodes: D3SankeyNode<SankeyNode, SankeyLink>[];
    links: D3SankeyLink<SankeyNode, SankeyLink>[];
    width: number;
    height: number;
  } = useMemo(() => {
    if (!data || data.totalIncome === 0) {
      return { nodes: [], links: [], width: 0, height: 0 };
    }

    const nodeMap = new Map<string, SankeyNode>();
    const linkMap = new Map<string, SankeyLink>();

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
        source: "expenses",
        target: parentNodeId,
        value: parent.amount,
        color: "#ef4444",
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
          source: parentNodeId,
          target: childNodeId,
          value: expense.amount,
          color: getColorFromCategoryId(expense.category.id),
        });
      }
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
          source: "expenses",
          target: nodeId,
          value: expense.amount,
          color: getColorFromCategoryId(expense.category.id),
        });
      }
    }

    const rawNodes = Array.from(nodeMap.values());
    const rawLinks = Array.from(linkMap.values());

    // Calculate dynamic dimensions based on node count
    // Base height + additional height per node to prevent overcrowding
    const baseWidth = 550;
    const baseHeight = 280;
    const minNodeHeight = 20; // Minimum space each node needs
    const numNodes = rawNodes.length;
    const requiredHeight = Math.max(baseHeight, numNodes * minNodeHeight);
    // Add extra width for many nodes to spread out the columns
    const requiredWidth = baseWidth + Math.max(0, (numNodes - 15) * 20);

    const sankeyGenerator = d3Sankey<SankeyNode, SankeyLink>()
      .nodeWidth(15)
      .nodePadding(Math.max(10, 18 - Math.max(0, numNodes - 10)))
      .extent([
        [10, 10],
        [requiredWidth - 10, requiredHeight - 10],
      ])
      .nodeAlign(sankeyLeft)
      .nodeId((d) => d.id);

    const graph = sankeyGenerator({
      nodes: rawNodes.map((n) => ({ ...n })),
      links: rawLinks.map((l) => ({ ...l })),
    });

    return {
      nodes: graph.nodes,
      links: graph.links,
      width: requiredWidth,
      height: requiredHeight,
    };
  }, [data]);

  if (!data || data.totalIncome === 0) {
    return (
      <Card className="shadow-sm">
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
      <Card className="shadow-sm">
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
    <Card className="shadow-sm w-full">
      <CardContent className="p-4">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[550px] w-full">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${Math.max(width, 550)} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full overflow-visible"
              role="img"
              aria-label="Income and expense flow diagram"
            >
              <title>Income and expense flow diagram</title>
              <defs>
                {links.map((link) => {
                  const sourceNode = link.source as SankeyNode;
                  const targetNode = link.target as SankeyNode;
                  const linkId = `${sourceNode.id}-${targetNode.id}`;
                  const gradientId = `gradient-${linkId}`;
                  const sourceColor = sourceNode.color;
                  const targetColor = targetNode.color;

                  return (
                    <linearGradient
                      key={gradientId}
                      id={gradientId}
                      gradientUnits="userSpaceOnUse"
                      x1={sourceNode.x1 || 0}
                      x2={targetNode.x0 || 0}
                    >
                      <stop offset="0%" stopColor={sourceColor} />
                      <stop offset="100%" stopColor={targetColor} />
                    </linearGradient>
                  );
                })}
              </defs>

              <g>
                {links.map((link) => {
                  const sourceNode = link.source as SankeyNode;
                  const targetNode = link.target as SankeyNode;
                  const linkId = `${sourceNode.id}-${targetNode.id}`;
                  const gradientId = `gradient-${linkId}`;
                  const isHovered = hoveredLink === linkId;
                  const isDimmed =
                    hoveredNode !== null ||
                    (hoveredLink !== null && hoveredLink !== linkId);

                  const linkData: D3SankeyLink<
                    D3SankeyNode<SankeyNode, SankeyLink>,
                    D3SankeyLink<SankeyNode, SankeyLink>
                  > = {
                    source: {
                      x0: sourceNode.x0,
                      x1: sourceNode.x1,
                      y0: sourceNode.y0,
                      y1: sourceNode.y1,
                    } as D3SankeyNode<SankeyNode, SankeyLink>,
                    target: {
                      x0: targetNode.x0,
                      x1: targetNode.x1,
                      y0: targetNode.y0,
                      y1: targetNode.y1,
                    } as D3SankeyNode<SankeyNode, SankeyLink>,
                    y0: link.y0,
                    y1: link.y1,
                    width: link.width,
                    value: link.value,
                  };

                  const pathD = sankeyLinkHorizontal()(linkData);

                  return (
                    <g key={linkId}>
                      {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover effect */}
                      <path
                        d={pathD || undefined}
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeWidth={link.width || 0}
                        strokeOpacity={isDimmed ? 0.1 : isHovered ? 0.7 : 0.4}
                        className="transition-all duration-200"
                        onMouseEnter={() => setHoveredLink(linkId)}
                        onMouseLeave={() => setHoveredLink(null)}
                      />
                      {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path hit area */}
                      <path
                        d={pathD || undefined}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={Math.max(link.width || 0, 10)}
                        onMouseEnter={() => setHoveredLink(linkId)}
                        onMouseLeave={() => setHoveredLink(null)}
                      >
                        <title>
                          {sourceNode.label} → {targetNode.label}:{" "}
                          <CurrencyAmount amount={link.value} />
                        </title>
                      </path>
                    </g>
                  );
                })}
              </g>

              <g>
                {nodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const isDimmed =
                    hoveredLink !== null ||
                    (hoveredNode !== null && hoveredNode !== node.id);

                  const nodeWidth = (node.x1 || 0) - (node.x0 || 0);
                  const nodeHeight = (node.y1 || 0) - (node.y0 || 0);
                  const hitAreaPadding = 8;

                  return (
                    <g key={node.id}>
                      {/* Visible node */}
                      <rect
                        x={node.x0}
                        y={node.y0}
                        width={nodeWidth}
                        height={nodeHeight}
                        fill={node.color}
                        rx={2}
                        className="transition-all duration-200"
                        opacity={isDimmed ? 0.3 : 1}
                        stroke={isHovered ? "#000" : "none"}
                        strokeWidth={isHovered ? 2 : 0}
                        pointerEvents="none"
                      />
                      {/* Invisible larger hit area */}
                      {/* biome-ignore lint/a11y/useSemanticElements: SVG element */}
                      <rect
                        x={(node.x0 || 0) - hitAreaPadding}
                        y={(node.y0 || 0) - hitAreaPadding}
                        width={nodeWidth + hitAreaPadding * 2}
                        height={nodeHeight + hitAreaPadding * 2}
                        fill="transparent"
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNodeClick(node.id)}
                        onMouseEnter={(e) => {
                          setHoveredNode(node.id);
                          const rect = e.currentTarget.getBoundingClientRect();
                          let nodeTotal = 0;
                          if (node.id === "income") {
                            nodeTotal = data.totalIncome;
                          } else if (node.id === "saved") {
                            nodeTotal = data.savedAmount;
                          } else if (node.id === "expenses") {
                            nodeTotal = data.totalExpenses;
                          } else if (node.id.startsWith("parent-")) {
                            const parentId = node.id.replace("parent-", "");
                            const parentExpenses =
                              data.expensesByCategory.filter(
                                (c) =>
                                  c.category.parentCategory?.id === parentId,
                              );
                            nodeTotal = parentExpenses.reduce(
                              (sum, c) => sum + c.amount,
                              0,
                            );
                          } else if (node.id.startsWith("child-")) {
                            const categoryId = node.id.replace("child-", "");
                            nodeTotal =
                              data.expensesByCategory.find(
                                (c) => c.category.id === categoryId,
                              )?.amount || 0;
                          } else if (node.id.startsWith("category-")) {
                            const categoryId = node.id.replace("category-", "");
                            nodeTotal =
                              data.expensesByCategory.find(
                                (c) => c.category.id === categoryId,
                              )?.amount || 0;
                          }
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10,
                            content: `${formatCurrency(node.value || 0)} (${((nodeTotal / (data.totalIncome || 1)) * 100).toFixed(1)}%)`,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredNode(null);
                          setTooltip(null);
                        }}
                      />

                      {/* biome-ignore lint/a11y/useSemanticElements: SVG text element */}
                      <text
                        x={
                          (node.x0 || 0) < width / 2
                            ? (node.x1 || 0) + 6
                            : (node.x0 || 0) - 6
                        }
                        y={((node.y0 || 0) + (node.y1 || 0)) / 2}
                        dy="0.35em"
                        textAnchor={
                          (node.x0 || 0) < width / 2 ? "start" : "end"
                        }
                        className="text-xs font-medium fill-foreground cursor-pointer"
                        style={{
                          fontSize: "11px",
                          opacity: isDimmed ? 0.3 : 1,
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNodeClick(node.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleNodeClick(node.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        {node.label}
                      </text>

                      {/* biome-ignore lint/a11y/useSemanticElements: SVG text element */}
                      <text
                        x={
                          (node.x0 || 0) < width / 2
                            ? (node.x1 || 0) + 6
                            : (node.x0 || 0) - 6
                        }
                        y={((node.y0 || 0) + (node.y1 || 0)) / 2 + 12}
                        dy="0.35em"
                        textAnchor={
                          (node.x0 || 0) < width / 2 ? "start" : "end"
                        }
                        className="text-[10px] fill-muted-foreground cursor-pointer"
                        style={{
                          fontSize: "10px",
                          opacity: isDimmed ? 0.3 : 1,
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNodeClick(node.id)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <CurrencyAmount amount={node.value || 0} />
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            {tooltip && (
              <div
                className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-black rounded shadow-lg pointer-events-none"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -100%)",
                }}
              >
                {tooltip.content}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
