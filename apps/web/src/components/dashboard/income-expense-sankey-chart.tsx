import { memo, useMemo } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import type { DashboardCategoryData } from "../../../../server/src/routers";

interface SankeyNode {
  name: string;
  value?: number;
  fill?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      source?: SankeyNode;
      target?: SankeyNode;
      value: number;
      payload?: {
        source?: SankeyNode;
        target?: SankeyNode;
        value: number;
      };
    };
  }>;
}

const COLORS = [
  "#22c55e", // green-500 - Income
  "#ef4444", // red-500 - Expenses
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f43f5e", // rose-500
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
];

function SankeyTooltip({ active, payload }: SankeyTooltipProps) {
  const { data: session } = useSession();
  const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const linkPayload = data.payload || data;

    if (linkPayload?.source && linkPayload.target) {
      const formattedValue = formatCurrency(linkPayload.value);
      const displayValue = formatValueWithPrivacy(
        formattedValue,
        isPrivacyMode,
      );

      return (
        <div className="bg-popover border border-border/50 rounded-lg shadow-lg p-3 space-y-1.5 min-w-[160px]">
          <div className="font-semibold text-sm border-b pb-1.5">
            {linkPayload.source.name} → {linkPayload.target.name}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Amount: </span>
            <span className="font-medium">{displayValue}</span>
          </div>
        </div>
      );
    }
  }
  return null;
}

// Custom node that reads fill from payload
function SankeyNode(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: SankeyNode;
}) {
  const { x, y, width, height, payload } = props;

  // Get fill color from node data, fallback to gray
  const fill = payload?.fill || "#888";

  return (
    <g>
      <rect
        x={x || 0}
        y={y || 0}
        width={width || 0}
        height={height || 0}
        fill={fill}
        stroke="#333"
        strokeWidth={1}
        rx={2}
      />
    </g>
  );
}

// Custom link with wider invisible hit area for better hoverability
function SankeyLink(props: {
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: {
    source?: SankeyNode;
    target?: SankeyNode;
    value: number;
  };
  index?: number;
}): React.ReactElement | null {
  const {
    sourceX,
    sourceY,
    sourceControlX,
    targetX,
    targetY,
    targetControlX,
    linkWidth,
    payload,
  } = props;

  if (
    sourceX === undefined ||
    sourceY === undefined ||
    sourceControlX === undefined ||
    targetX === undefined ||
    targetY === undefined ||
    targetControlX === undefined ||
    linkWidth === undefined
  ) {
    return null;
  }

  // Build the path for the link
  const path = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;

  // Calculate minimum hit area width (at least 16px for easier hovering)
  const minHitWidth = 16;
  const hitWidth = Math.max(linkWidth, minHitWidth);

  return (
    <g>
      {/* Invisible hit area - wider than visible link for easier hovering */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={hitWidth}
        style={{ cursor: "pointer" }}
      />
      {/* Visible link */}
      <path
        d={path}
        fill="none"
        stroke="#888"
        strokeWidth={linkWidth}
        strokeOpacity={0.4}
      />
    </g>
  );
}

export const IncomeExpenseSankeyChart = memo(function IncomeExpenseSankeyChart({
  data,
}: {
  data: DashboardCategoryData;
}) {
  const sankeyData = useMemo((): SankeyData | null => {
    if (!data || data.length === 0) return null;

    // Separate income and expense categories
    const incomeCategories = data.filter((item) => item.category.treatAsIncome);
    const expenseCategories = data.filter(
      (item) => !item.category.treatAsIncome && Number(item.amount) < 0,
    );

    if (expenseCategories.length === 0) return null;

    // Calculate totals
    const totalIncome = incomeCategories.reduce(
      (sum, item) => sum + Math.abs(Number(item.amount)),
      0,
    );
    const totalExpenses = expenseCategories.reduce(
      (sum, item) => sum + Math.abs(Number(item.amount)),
      0,
    );

    // Build nodes
    const nodes: SankeyNode[] = [];
    const nodeIndexMap = new Map<string, number>();

    // Add income source node
    const incomeNodeName =
      totalIncome > 0 ? "Income Sources" : "Starting Balance";
    nodes.push({
      name: incomeNodeName,
      value: Math.max(totalIncome, totalExpenses),
      fill: "#22c55e", // green-500
    });
    nodeIndexMap.set(incomeNodeName, 0);

    // Add expense category nodes (limit to top 8 for readability)
    const sortedExpenses = [...expenseCategories]
      .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
      .slice(0, 8);

    sortedExpenses.forEach((item, index) => {
      const nodeName = item.category.name;
      nodes.push({
        name: nodeName,
        value: Math.abs(Number(item.amount)),
        fill: COLORS[(index + 1) % COLORS.length],
      });
      nodeIndexMap.set(nodeName, index + 1);
    });

    // If there are more expenses, add an "Other" node
    const otherExpenses = expenseCategories.filter(
      (item) => !sortedExpenses.some((e) => e.category.id === item.category.id),
    );
    const otherTotal = otherExpenses.reduce(
      (sum, item) => sum + Math.abs(Number(item.amount)),
      0,
    );

    if (otherTotal > 0) {
      nodes.push({
        name: "Other",
        value: otherTotal,
        fill: "#6b7280", // gray-500
      });
      nodeIndexMap.set("Other", nodes.length - 1);
    }

    // Add remaining balance node if there's leftover
    const remaining = totalIncome - totalExpenses;
    if (remaining > 0) {
      nodes.push({ name: "Saved", value: remaining, fill: "#22c55e" });
      nodeIndexMap.set("Saved", nodes.length - 1);
    }

    // Build links
    const links: SankeyLink[] = [];
    const sourceIndex = 0; // Income/Starting Balance node

    // Links to expense categories
    sortedExpenses.forEach((item) => {
      const targetIndex = nodeIndexMap.get(item.category.name);
      if (targetIndex !== undefined) {
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: Math.abs(Number(item.amount)),
        });
      }
    });

    // Link to "Other" if exists
    if (otherTotal > 0) {
      const otherIndex = nodeIndexMap.get("Other");
      if (otherIndex !== undefined) {
        links.push({
          source: sourceIndex,
          target: otherIndex,
          value: otherTotal,
        });
      }
    }

    // Link to "Saved" if there's remaining income
    if (remaining > 0) {
      const savedIndex = nodeIndexMap.get("Saved");
      if (savedIndex !== undefined) {
        links.push({
          source: sourceIndex,
          target: savedIndex,
          value: remaining,
        });
      }
    }

    return { nodes, links };
  }, [data]);

  if (!sankeyData || sankeyData.nodes.length <= 1) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Money Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No expense data available to display money flow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="sr-only">Money Flow</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodePadding={20}
              margin={{ left: 16, right: 16, top: 16, bottom: 16 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              link={SankeyLink as any}
              node={SankeyNode}
            >
              <Tooltip content={<SankeyTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
            <span>Income / Savings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
            <span>Expenses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
