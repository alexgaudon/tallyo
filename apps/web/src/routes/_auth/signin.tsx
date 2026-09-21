import { createFileRoute, redirect } from "@tanstack/react-router";
import { BarChart3, Building2, PieChart, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
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
        throw redirect({ to: "/" });
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

  const features = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Log transactions",
      description: "Import from any financial provider via API integration.",
    },
    {
      icon: <PieChart className="h-4 w-4" />,
      title: "Auto-categorize",
      description: "Transactions are automatically sorted into categories.",
    },
    {
      icon: <Building2 className="h-4 w-4" />,
      title: "Normalize vendors",
      description: "Merchants are consolidated for clearer analysis.",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      title: "Visualize insights",
      description: "Charts and stats help you understand your spending.",
    },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <Panel>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
              <img
                src="/favicon.ico"
                alt="Tallyo"
                className="h-8 w-8 rounded-lg"
              />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {usersExist ? "Sign in" : "Get started"}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground text-balance">
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
              className="mr-2 h-4 w-4"
            >
              <path
                fill="#5865f2"
                d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36A77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19A77,77,0,0,0,39.6,85.25,105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
              />
            </svg>
            {usersExist ? "Continue with Discord" : "Register with Discord"}
          </Button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {features.map((feature) => (
          <Panel key={feature.title} dense>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {feature.icon}
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-medium">{feature.title}</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
