import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/categories")({
  beforeLoad: () => {
    throw redirect({ to: "/taxonomy" });
  },
});
