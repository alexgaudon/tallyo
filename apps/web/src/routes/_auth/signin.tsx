import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  Computer,
  PieChart,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { hasUsers, initiateDiscordAuth } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/signin")({
  component: RouteComponent,
  loader: async () => {
    const usersExist = await hasUsers();
    return { usersExist };
  },
  beforeLoad: async ({ context, search }) => {
    if (search.scope !== "token") {
      if (context.isAuthenticated) {
        redirect({ to: "/" });
      }
    }
  },
  validateSearch: z.object({
    from: z.string().optional(),
    scope: z.string().optional(),
    error: z.string().optional(),
  }),
});

function RouteComponent() {
  const { usersExist } = Route.useLoaderData();
  const { error } = Route.useSearch();

  if (error) {
    toast.error(decodeURIComponent(error));
  }

  const handleDiscordAuth = async () => {
    queryClient.invalidateQueries({ queryKey: ["session"] });
    await initiateDiscordAuth();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="max-w-md space-y-8">
          {/* Header - visible only on left side */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {usersExist ? "Welcome back" : "Welcome to Tallyo"}
            </h1>
            <p className="text-muted-foreground">
              {usersExist
                ? "Sign in to your account to continue"
                : "Create your account to get started"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="cursor-pointer"
              variant="outline"
              type="button"
              onClick={handleDiscordAuth}
              size="lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 127.14 96.36"
                aria-label="Discord"
                role="img"
                className="w-5 h-5 mr-2"
              >
                <path
                  fill="#5865f2"
                  d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
                />
              </svg>
              {usersExist ? "Sign in with Discord" : "Register with Discord"}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Visual Content */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-linear-to-br from-primary/20 via-primary/10 to-secondary/20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/30 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center text-foreground p-16 w-full">
          <div className="w-full max-w-2xl space-y-12">
            {/* Hero Section */}
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-primary/20">
                    <img
                      src="/favicon.ico"
                      alt="Tallyo"
                      className="w-12 h-12 rounded-full"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-5xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Measure. Understand. Improve.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                  Tallyo helps you gain insights into your personal finances so
                  you can make better financial decisions.
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="group relative p-6 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-semibold text-foreground">
                      Transaction Logging
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Easily upload transactions from any financial provider via
                      API.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative p-6 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <PieChart className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-semibold text-foreground">
                      Categorization
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Automatically categorize transactions for streamlined
                      analysis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative p-6 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-semibold text-foreground">
                      Vendor Normalization
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Normalizes vendors to a single entity for better analysis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative p-6 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-semibold text-foreground">
                      Insights & Charts
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Visualize your finances with intuitive charts and key
                      stats.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
              <Computer className="w-4 h-4 text-primary" />
              <span>Built by developers for developers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
