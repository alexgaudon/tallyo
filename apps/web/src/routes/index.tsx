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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <img
                  src="/favicon.ico"
                  alt="Tallyo"
                  className="w-12 h-12 rounded-full"
                />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Measure. Understand. Improve.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Tallyo helps you gain insights into your personal finances so you
              can make better financial decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/signin">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for Financial Mastery
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to take control of your finances, from
            transaction tracking to advanced analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feature.color}`}
                >
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who are already making better financial
            decisions with Tallyo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6"
            >
              <Link to="/signin">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/favicon.ico"
              alt="Tallyo"
              className="w-8 h-8 rounded-full mr-2"
            />
            <span className="text-xl font-semibold">Tallyo</span>
          </div>
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} Tallyo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
