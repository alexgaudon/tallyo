import { createFileRoute, redirect } from "@tanstack/react-router";
import { BarChart3, Building2, PieChart, TrendingUp } from "lucide-react";
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
      <div className="flex-1 flex items-center justify-center p-8 bg-background border-r border-border">
        <div className="max-w-md w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {usersExist ? "Sign in" : "Get started"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {usersExist
                ? "Sign in to your account to continue"
                : "Create your account to start tracking your finances"}
            </p>
          </div>

          <Button
            className="w-full cursor-pointer"
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
              className="w-4 h-4 mr-2"
            >
              <path
                fill="#5865f2"
                d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36A77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19A77,77,0,0,0,39.6,85.25,105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
              />
            </svg>
            {usersExist ? "Continue with Discord" : "Register with Discord"}
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 flex-col justify-center p-16 bg-muted/20">
        <div className="w-full max-w-xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Track, understand, improve.
            </h2>
            <p className="text-muted-foreground">
              Tallyo gives you clarity on your personal finances.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="p-6 bg-background">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-accent">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Log transactions</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Import from any financial provider via API integration.
              </p>
            </div>

            <div className="p-6 bg-background">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-accent">
                  <PieChart className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Auto-categorize</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Transactions are automatically sorted into categories.
              </p>
            </div>

            <div className="p-6 bg-background">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-accent">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Normalize vendors</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Merchants are consolidated for clearer analysis.
              </p>
            </div>

            <div className="p-6 bg-background">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-accent">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Visualize insights</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Charts and stats help you understand your spending.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
