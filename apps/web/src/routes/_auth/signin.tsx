import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { hasUsers, initiateDiscordAuth } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/signin")({
  component: RouteComponent,
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
  const [usersExist, setUsersExist] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { from, error } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if users exist
    hasUsers()
      .then((exists) => {
        setUsersExist(exists);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to check users:", err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // Show error if present in URL
    if (error) {
      toast.error(decodeURIComponent(error));
      // Clear error from URL
      navigate({
        to: "/signin",
        search: { from, scope: undefined, error: undefined },
        replace: true,
      });
    }
  }, [error, from, navigate]);

  const handleDiscordAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["session"] });
    initiateDiscordAuth();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
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
      <div className="hidden lg:flex flex-1 bg-linear-to-br from-accent to-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
          <div className="space-y-8 max-w-lg">
            {/* Hero Section */}
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mx-auto">
                <img
                  src="/favicon.ico"
                  alt="Tallyo"
                  className="w-16 h-16 rounded-full"
                />
              </div>
              <h2 className="text-4xl font-bold">
                Measure. Understand. Improve.
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                Tallyo helps you gain insights into your personal finances so
                you can make better financial decisions.
              </p>
            </div>

            {/* Features Section */}
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Features</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">
                    Transaction Logging
                  </h4>
                  <p className="text-sm text-white/80">
                    Easily upload transactions from any financial provider via
                    API.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Categorization</h4>
                  <p className="text-sm text-white/80">
                    Automatically categorize transactions for streamlined
                    analysis.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">
                    Vendor Normalization
                  </h4>
                  <p className="text-sm text-white/80">
                    Normalizes vendors to a single entity for better analysis.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">
                    Insights & Charts
                  </h4>
                  <p className="text-sm text-white/80">
                    Visualize your finances with intuitive charts and key stats.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
