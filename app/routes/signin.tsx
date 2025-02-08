import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Icons } from "@/components/icons";

import icon from "@/favicon.ico?url";

export const Route = createFileRoute("/signin")({
  component: AuthPage,
  beforeLoad: async ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: "/",
      });
    }
  },
});

export default function AuthPage() {
  return (
    <div className="flex flex-col justify-center items-center w-screen h-screen container">
      <div className="flex flex-col justify-center space-y-6 mx-auto w-full sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="flex justify-center items-center space-x-2">
            <img
              src={icon}
              alt={`${import.meta.env.VITE_APP_NAME} logo`}
              className="rounded-lg w-8 h-8"
            />
            <h1 className="font-semibold text-2xl tracking-tight">
              Welcome to {import.meta.env.VITE_APP_NAME}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Access your account with one of the signin options
          </p>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            await authClient.signIn.social({
              provider: "discord",
              callbackURL: "/", //redirect to dashboard after sign in
            });
          }}
        >
          <Icons.discord />
          Discord
        </Button>
      </div>
    </div>
  );
}
