import { auth } from "@/server/auth";
import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  POST: async (request) => {
    return await auth.handler(request.request);
  },
  GET: async (request) => {
    return await auth.handler(request.request);
  },
});
