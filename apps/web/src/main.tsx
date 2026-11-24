import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";
import { registerSW } from "virtual:pwa-register";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: { orpc, queryClient, auth: null, isAuthenticated: false },
  Wrap: function WrapComponent({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Service worker registration. `registerType: "prompt"` means a waiting
// worker surfaces through `onNeedRefresh` instead of auto-reloading.
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
updateSW = registerSW({
  onNeedRefresh() {
    toast.message("A new version is available", {
      description: "Reload to pick up the latest Tallyo build.",
      action: {
        label: "Reload",
        onClick: () => void updateSW?.(true),
      },
    });
  },
  onOfflineReady() {
    // The app shell is cached; no announcement needed for a draft.
  },
});

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
