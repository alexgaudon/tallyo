import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the git commit for the build identifier. Prefers an explicit
// VITE_GIT_COMMIT (e.g. set as a Docker build ARG) and otherwise falls back
// to the current HEAD when a .git directory is available at build time.
function resolveGitCommit(env: Record<string, string>): string {
  if (env.VITE_GIT_COMMIT) {
    return env.VITE_GIT_COMMIT;
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export default defineConfig(({ mode }) => {
  // Load env file based on mode (development/production)
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [tailwindcss(), TanStackRouterVite({}), react()],
    define: {
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(
        new Date().toISOString(),
      ),
      "import.meta.env.VITE_GIT_COMMIT": JSON.stringify(resolveGitCommit(env)),
    },
    base: process.env.NODE_ENV === "production" ? "/" : "/",
    server: {
      allowedHosts: env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(",").map((h) => h.trim())
        : undefined,
      host: true,
      port: 3001,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/rpc": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
      // Enable source maps for debugging
      sourcemap: false,
      // Optimize dependencies
      commonjsOptions: {
        include: [/node_modules/],
      },
      // Enable minification
      minify: "esbuild",
      // Target modern browsers for better tree-shaking
      target: "esnext",
      // Enable code splitting
      rollupOptions: {
        output: {
          // Split vendor chunks
          manualChunks: {
            // React and core libraries
            vendor: ["react", "react-dom"],
            // TanStack libraries
            tanstack: ["@tanstack/react-router", "@tanstack/react-query"],
            // Radix UI components
            radix: [
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-avatar",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-label",
              "@radix-ui/react-popover",
              "@radix-ui/react-select",
              "@radix-ui/react-slot",
              "@radix-ui/react-switch",
            ],
            // Icons and utilities
            icons: ["lucide-react"],
            // Form libraries
            forms: ["react-hook-form", "@hookform/resolvers", "zod"],
            // Date utilities
            dates: ["date-fns"],
            // ORPC libraries
            orpc: ["@orpc/client", "@orpc/react-query", "@orpc/server"],
          },
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@tanstack/react-router",
        "@tanstack/react-query",
        "lucide-react",
      ],
    },
  };
});
