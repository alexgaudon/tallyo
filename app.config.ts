import { defineConfig } from "@tanstack/react-start/config";
import type { App } from "vinxi";
import tsConfigPaths from "vite-tsconfig-paths";

const tanstackApp = defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }) as any,
    ],
  },
  routers: {
    ssr: {
      vite: {
        ssr: {
          noExternal: ["react-dropzone"],
        },
      },
    },
  },
  server: {
    preset: "node-server",
  },
});

// Wait for the tanstackApp promise to resolve before accessing its config
export default tanstackApp.then((resolvedApp) => {
  const routers = resolvedApp.config.routers.map((r: any) => {
    return {
      ...r,
      middleware: r.target === "server" ? "./app/middleware.tsx" : undefined,
    };
  });

  const app: App = {
    ...resolvedApp,
    config: {
      ...resolvedApp.config,
      routers: routers,
    },
  };

  return app;
});
