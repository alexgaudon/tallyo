import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/start";
import { getAuth } from "./functions";

export const userMiddleware = createMiddleware().server(async ({ next }) => {
  const auth = await getAuth();

  if (!auth.isAuthenticated) {
    throw redirect({
      to: "/signin",
    });
  }

  return next({
    context: {
      auth,
    },
  });
});
