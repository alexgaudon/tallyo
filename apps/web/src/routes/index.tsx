import { useQuery } from "@tanstack/react-query";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  beforeLoad: async ({ context }) => {
    const queryClient = context.queryClient;
    await queryClient.prefetchQuery(orpc.healthCheck.queryOptions());
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function HomeComponent() {
  const _healthCheck = useQuery(orpc.healthCheck.queryOptions());

  const features = [
    {
      icon: <Upload className="h-6 w-6" />,
      title: "Transaction Logging",
      description:
        "Easily upload transactions from any financial provider via API or manual entry. Support for bulk imports and real-time synchronization.",
      color: "text-blue-600",
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Automatic Categorization",
      description:
        "Smart categorization system that automatically organizes your transactions for streamlined analysis and reporting.",
      color: "text-green-600",
    },
    {
      icon: <Store className="h-6 w-6" />,
      title: "Vendor Normalization",
      description:
        "Intelligent vendor matching that normalizes different transaction names to a single merchant entity for better analysis.",
      color: "text-purple-600",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Insights & Analytics",
      description:
        "Comprehensive dashboard with interactive charts, spending patterns, and key financial metrics to track your progress.",
      color: "text-orange-600",
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: "Advanced Filtering",
      description:
        "Powerful search and filter capabilities to find specific transactions, merchants, or categories quickly.",
      color: "text-indigo-600",
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Date Range Analysis",
      description:
        "Flexible date range filtering to analyze your finances over any time period - daily, monthly, or custom ranges.",
      color: "text-pink-600",
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Privacy Mode",
      description:
        "Built-in privacy controls to hide sensitive financial data when sharing your screen or working in public spaces.",
      color: "text-gray-600",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "API Integration",
      description:
        "RESTful API for seamless integration with your existing financial tools and automated transaction imports.",
      color: "text-yellow-600",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Savings Rate Tracking",
      description:
        "Monitor your savings rate over time and visualize your progress toward financial goals with clear, actionable insights.",
      color: "text-teal-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-20 sm:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                <img
                  src="/favicon.ico"
                  alt="Tallyo"
                  className="w-9 h-9 rounded-lg"
                />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Your finances, in one place
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Track spending, see where your money goes, and make better
              decisions with clear insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
              >
                <Link to="/signin">Get started free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
            Built for clarity
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Transaction tracking, categories, and reports so you always know
            where your money goes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/80 bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div
                  className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 ${feature.color}`}
                >
                  {feature.icon}
                </div>
                <CardTitle className="text-base font-semibold">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Start tracking today
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your data or add transactions manually—you’re in control.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
          >
            <Link to="/signin">Get started free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/favicon.ico" alt="Tallyo" className="w-6 h-6 rounded" />
            <span className="font-semibold text-foreground">Tallyo</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Tallyo
          </p>
        </div>
      </footer>
    </div>
  );
}
