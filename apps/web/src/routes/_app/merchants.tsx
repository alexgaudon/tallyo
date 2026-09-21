import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/merchants")({
  beforeLoad: () => {
    throw redirect({ to: "/taxonomy" });
  },
});
