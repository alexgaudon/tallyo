import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
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
    plugins: [
      tailwindcss(),
      tanstackStart({
        spa: { enabled: true },
      }),
      // react's vite plugin must come after start's vite plugin
      react(),
    ],
    define: {
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(
        new Date().toISOString(),
      ),
      "import.meta.env.VITE_GIT_COMMIT": JSON.stringify(resolveGitCommit(env)),
    },
    server: {
      allowedHosts: env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(",").map((h) => h.trim())
        : undefined,
      host: true,
      port: 3002,
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
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      target: "esnext",
      minify: "esbuild",
    },
  };
});
