import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

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
              alt={`Tallyo logo`}
              className="rounded-lg w-8 h-8"
            />
            <h1 className="font-semibold text-2xl tracking-tight">
              Welcome to Tallyo
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Access your account with one of the signin options
          </p>
        </div>
        <div className="flex flex-col space-y-4">
          <Button
            variant="outline"
            type="button"
            onClick={async () => {
              await authClient.signIn.social({
                provider: "discord",
                callbackURL: "/",
              });
            }}
          >
            <Icons.discord />
            Discord
          </Button>

          {!import.meta.env.PROD && (
            <div className="flex flex-col space-y-4 p-4 border border-red-600 rounded-md">
              <form
                className="flex flex-col space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const { error } = await authClient.signIn.email({
                    email: formData.get("email") as string,
                    password: formData.get("password") as string,
                    callbackURL: "/",
                  });

                  if (error) {
                    alert(error.message);
                  }
                }}
              >
                <p className="flex items-center space-x-2 justify-center gap-4">
                  <Wrench className="w-4 h-4" />
                  Developer Sign In
                </p>
                <input
                  type="text"
                  name="email"
                  placeholder="Email"
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <Button type="submit">Sign in with credentials</Button>
              </form>

              <form
                className="flex flex-col space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const { data, error } = await authClient.signUp.email({
                    email: formData.get("email") as string,
                    password: formData.get("password") as string,
                    name: formData.get("email") as string, // Using email as name since we don't have a name field
                    callbackURL: "/",
                  });

                  if (error) {
                    alert(error.message);
                  }

                  if (data) {
                    alert("Account created, now login.");
                  }
                }}
              >
                <p className="flex items-center space-x-2 justify-center gap-4">
                  <Wrench className="w-4 h-4" />
                  Developer Create Account
                </p>
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <input
                  type="text"
                  name="email"
                  placeholder="Email"
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="px-3 py-2 border rounded-md"
                  required
                />
                <Button type="submit">Create account with credentials</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
