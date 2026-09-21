import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Inbox } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ChartFrame } from "@/components/ui/chart-frame";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/primitives")({
  component: PrimitivesDevRoute,
});

const SAMPLE_BARS = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 68 },
  { label: "Mar", value: 35 },
  { label: "Apr", value: 90 },
  { label: "May", value: 54 },
  { label: "Jun", value: 76 },
  { label: "Jul", value: 30 },
];

const LEGEND_ITEMS = [
  { label: "Groceries", color: "var(--chart-1)" },
  { label: "Transport", color: "var(--chart-2)" },
  { label: "Dining", color: "var(--chart-4)" },
];

function PrimitivesDevRoute() {
  const [showIncome, setShowIncome] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!import.meta.env.DEV) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Not available"
          description="The primitives review surface is only available in development."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-12 px-4 py-8 lg:px-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
            Phase 0 · Review surface
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product primitives
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Visual reference for <code>Panel</code>, <code>ChartFrame</code>,
            and the soft-glass surfaces, shown at mobile and desktop widths in
            light and dark. Fake data only.
          </p>
        </div>
        <ModeToggle />
      </header>

      <section className="space-y-6">
        <SectionHeading
          index="01"
          title="Panel"
          description="Token-driven surface for grouped content with an eyebrow heading, optional description, and trailing actions."
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <DeviceFrame label="Mobile · 380px" width="max-w-[380px]">
            <Panel
              title="Cash flow overview"
              description="Current month"
              actions={
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              }
            >
              <StatList
                items={[
                  { label: "Income", value: "$4,200.00", tone: "income" },
                  { label: "Expenses", value: "-$2,780.00", tone: "expense" },
                  { label: "Net", value: "$1,420.00" },
                ]}
              />
            </Panel>

            <Panel
              dense
              title="Dense panel"
              actions={<Button size="sm">Add</Button>}
            >
              <StatList
                items={[
                  { label: "Income", value: "$4,200.00", tone: "income" },
                  { label: "Expenses", value: "-$2,780.00", tone: "expense" },
                ]}
              />
            </Panel>
          </DeviceFrame>

          <div className="space-y-4">
            <Panel
              title="Spending breakdown"
              description="Top categories for the selected period."
              actions={
                <SegmentedToggle
                  value={showIncome ? "income" : "expenses"}
                  options={[
                    { value: "expenses", label: "Expenses" },
                    { value: "income", label: "Income" },
                  ]}
                  onChange={(value) => setShowIncome(value === "income")}
                />
              }
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {LEGEND_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-semibold tabular-nums">
                      {showIncome ? "$980.00" : "-$612.00"}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <p className="text-sm text-muted-foreground">
                Panel with no title or actions renders as a bare surface and
                still keeps its border, radius, and soft shadow.
              </p>
            </Panel>

            <Panel
              dense
              title="Compact actions"
              actions={
                <Button size="sm" variant="outline">
                  Refresh
                </Button>
              }
            >
              <p className="text-sm text-muted-foreground">
                Dense padding keeps toolbars and list rows tight.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          index="02"
          title="ChartFrame"
          description="Shared chart chrome: title, legend, actions, tooltip provider, and loading/empty states. Works inside a Panel or standalone."
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <DeviceFrame label="Mobile · 380px" width="max-w-[380px]">
            <Panel title="Monthly spend" dense>
              <ChartFrame
                title="By month"
                description="Net spend, last 7 months"
                legend={<Legend items={LEGEND_ITEMS} />}
              >
                <FakeBarChart />
              </ChartFrame>
            </Panel>

            <Panel title="No activity" dense>
              <ChartFrame
                isEmpty
                emptyTitle="No spending yet"
                emptyDescription="Add transactions to populate this chart."
              >
                <FakeBarChart />
              </ChartFrame>
            </Panel>
          </DeviceFrame>

          <div className="space-y-4">
            <Panel
              title="Income flow"
              description="Standalone ChartFrame nested inside a Panel."
            >
              <ChartFrame
                title="Cash in vs out"
                legend={<Legend items={LEGEND_ITEMS} />}
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLoading((value) => !value)}
                  >
                    {isLoading ? "Show data" : "Simulate load"}
                  </Button>
                }
                isLoading={isLoading}
              >
                <FakeSparkline />
              </ChartFrame>
            </Panel>

            <Panel title="Loading permutation" dense>
              <ChartFrame
                title="Category totals"
                description="Placeholder shown while data resolves"
                legend={<Legend items={LEGEND_ITEMS} />}
                isLoading
              >
                <FakeBarChart />
              </ChartFrame>
            </Panel>

            <Panel title="EmptyState directly" dense>
              <EmptyState
                compact
                bordered={false}
                icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
                title="No merchant data"
                description="The same primitive ChartFrame renders for its empty state."
              />
            </Panel>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          index="03"
          title="Soft glass"
          description="Layered translucent surfaces with backdrop blur and light-catching edges. The same markup renders in the active theme and inside a forced dark context."
        />
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <GlassContext label="Active theme">
            <GlassShowcase />
          </GlassContext>
          <GlassContext label="Dark context (forced)" dark>
            <GlassShowcase />
          </GlassContext>
        </div>
      </section>
    </div>
  );
}

function GlassContext({
  label,
  dark = false,
  children,
}: {
  label: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "bg-background bg-ambient space-y-4 rounded-2xl p-4",
          dark && "dark text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function GlassShowcase() {
  return (
    <>
      <Panel
        title="Glass panel"
        description="Panel renders with the glass-surface utility."
        actions={
          <Button size="sm" variant="ghost">
            Action
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="secondary">
            Secondary
          </Button>
          <Button size="sm" variant="outline">
            Outline
          </Button>
          <Button size="sm" variant="ghost">
            Ghost
          </Button>
        </div>
      </Panel>

      <div className="glass rounded-xl p-4">
        <p className="text-sm text-muted-foreground">
          Inline <code className="font-mono text-foreground">.glass</code>{" "}
          surface for nested content.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Overlay menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Glass overlay</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary">
              Popover
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 text-sm">
            Translucent popover with backdrop blur.
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-3">
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        {index}
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DeviceFrame({
  label,
  width,
  children,
}: {
  label: string;
  width: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "space-y-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-3",
          width,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function StatList({
  items,
}: {
  items: { label: string; value: string; tone?: "income" | "expense" }[];
}) {
  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
        >
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              item.tone === "income" && "text-income",
              item.tone === "expense" && "text-expense",
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-muted/60 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </>
  );
}

function FakeBarChart() {
  const max = Math.max(...SAMPLE_BARS.map((bar) => bar.value));

  return (
    <svg
      role="img"
      aria-label="Sample bar chart"
      viewBox="0 0 280 140"
      className="h-40 w-full"
    >
      <line
        x1="0"
        y1="120"
        x2="280"
        y2="120"
        stroke="var(--border)"
        strokeWidth="1"
      />
      {SAMPLE_BARS.map((bar, index) => {
        const height = (bar.value / max) * 96;
        const x = 10 + index * 38;
        return (
          <g key={bar.label}>
            <rect
              x={x}
              y={120 - height}
              width="24"
              height={height}
              rx="4"
              fill={`var(--chart-${(index % 8) + 1})`}
            />
            <text
              x={x + 12}
              y="134"
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "9px" }}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FakeSparkline() {
  return (
    <div className="space-y-2">
      <svg
        role="img"
        aria-label="Sample sparkline"
        viewBox="0 0 180 24"
        preserveAspectRatio="none"
        className="h-10 w-full"
      >
        <polyline
          points="0,18 30,10 60,14 90,4 120,9 150,2 180,7"
          fill="none"
          stroke="var(--income)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Jan</span>
        <span className="flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" />
          +12.4% vs last period
        </span>
        <span>Jul</span>
      </div>
    </div>
  );
}
