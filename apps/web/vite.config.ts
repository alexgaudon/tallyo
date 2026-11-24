import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, lazyPlugins } from "vite-plus";
import { VitePWA } from "vite-plugin-pwa";

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
      VitePWA({
        strategies: "generateSW",
        registerType: "prompt",
        // Registration happens via the `virtual:pwa-register` module in
        // `src/main.tsx`, so the plugin must not inject its own script tag.
        injectRegister: false,
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon-180x180.png",
          "pwa-64x64.png",
        ],
        manifest: {
          id: "/",
          name: "Tallyo",
          short_name: "Tallyo",
          description: "Personal finance inspection tool",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#0b0a0c",
          theme_color: "#0b0a0c",
          icons: [
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          navigateFallback: "index.html",
          // Data endpoints must always hit the network, never the cache.
          navigateFallbackDenylist: [/^\/api\//, /^\/rpc\//, /^\/mcp/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Geist Mono is loaded from jsDelivr; keep it offline-capable.
              urlPattern: ({ url }) =>
                url.origin === "https://cdn.jsdelivr.net",
              handler: "CacheFirst",
              options: {
                cacheName: "geist-font-cache",
                expiration: {
                  maxEntries: 8,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          // Keep the service worker available in dev so installability can be
          // exercised on the internal dev proxy. Unregister via DevTools
          // (Application > Service Workers) when switching back to plain dev.
          enabled: true,
          type: "module",
          navigateFallback: "index.html",
        },
      }),
    ]),
    define: {
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(
        new Date().toISOString(),
      ),
      "import.meta.env.VITE_GIT_COMMIT": JSON.stringify(resolveGitCommit(env)),
    },
    base: process.env.NODE_ENV === "production" ? "/" : "/",
    server: {
      allowedHosts: [
        ...(env.VITE_ALLOWED_HOSTS || "")
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean),
        "tallyo.dev.misery.systems",
      ],
      host: true,
      port: Number(process.env.PORT ?? 3001),
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
