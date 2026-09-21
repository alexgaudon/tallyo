import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Eye,
  Search,
  Store,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  beforeLoad: async ({ context }) => {
    const queryClient = context.queryClient;
    await queryClient.prefetchQuery(orpc.healthCheck.queryOptions());
    if (context.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function HomeComponent() {
  const features = [
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Transaction Logging",
      description:
        "Easily upload transactions from any financial provider via API or manual entry. Support for bulk imports and real-time synchronization.",
    },
    {
      icon: <CheckCircle className="h-5 w-5" />,
      title: "Automatic Categorization",
      description:
        "Smart categorization system that automatically organizes your transactions for streamlined analysis and reporting.",
    },
    {
      icon: <Store className="h-5 w-5" />,
      title: "Vendor Normalization",
      description:
        "Intelligent vendor matching that normalizes different transaction names to a single merchant entity for better analysis.",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Insights & Analytics",
      description:
        "Comprehensive dashboard with interactive charts, spending patterns, and key financial metrics to track your progress.",
    },
    {
      icon: <Search className="h-5 w-5" />,
      title: "Advanced Filtering",
      description:
        "Powerful search and filter capabilities to find specific transactions, merchants, or categories quickly.",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Date Range Analysis",
      description:
        "Flexible date range filtering to analyze your finances over any time period - daily, monthly, or custom ranges.",
    },
    {
      icon: <Eye className="h-5 w-5" />,
      title: "Privacy Mode",
      description:
        "Built-in privacy controls to hide sensitive financial data when sharing your screen or working in public spaces.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "API Integration",
      description:
        "RESTful API for seamless integration with your existing financial tools and automated transaction imports.",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Savings Rate Tracking",
      description:
        "Monitor your savings rate over time and visualize your progress toward financial goals with clear, actionable insights.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center sm:py-24 lg:px-8">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
              <img
                src="/favicon.ico"
                alt="Tallyo"
                className="h-9 w-9 rounded-lg"
              />
            </div>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Personal finance inspection
          </p>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-5xl">
            Your finances, in one place
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance">
            Track spending, see where your money goes, and make better decisions
            with clear insights.
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link to="/signin">Get started free</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-2xl px-4 py-16 sm:py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Built for clarity
          </h2>
          <p className="text-muted-foreground text-balance">
            Transaction tracking, categories, and reports so you always know
            where your money goes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Panel key={feature.title} className="h-full">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {feature.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/30 py-16">
        <div className="mx-auto max-w-screen-2xl px-4 text-center lg:px-8">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
            Start tracking today
          </h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground text-balance">
            Connect your data or add transactions manually—you’re in control.
          </p>
          <Button asChild size="lg">
            <Link to="/signin">Get started free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
