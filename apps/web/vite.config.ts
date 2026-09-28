import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, lazyPlugins } from "vite-plus";

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
    plugins: lazyPlugins(() => [
      tailwindcss(),
      TanStackRouterVite({}),
      react(),
    ]),
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
          target: env.VITE_API_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
        "/rpc": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:3000",
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
          // Split vendor chunks. Rolldown only supports the function form of
          // manualChunks, so the previous object mapping lives here as a
          // matcher over the resolved module id.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            const mod = id.slice(id.lastIndexOf("node_modules/") + 13);
            if (mod.startsWith("react/") || mod.startsWith("react-dom/")) {
              return "vendor";
            }
            if (
              mod.startsWith("@tanstack/react-router") ||
              mod.startsWith("@tanstack/react-query")
            ) {
              return "tanstack";
            }
            if (mod.startsWith("@radix-ui/")) return "radix";
            if (mod.startsWith("lucide-react")) return "icons";
            if (
              mod.startsWith("react-hook-form") ||
              mod.startsWith("@hookform/") ||
              mod.startsWith("zod")
            ) {
              return "forms";
            }
            if (mod.startsWith("date-fns")) return "dates";
            if (mod.startsWith("@orpc/")) return "orpc";
            return;
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
    // Web tests cover pure logic (view encoding, formatting, matching), so a
    // node environment is enough; no DOM/React rendering here.
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
