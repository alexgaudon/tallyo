import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Web tests cover pure logic (view encoding, formatting, matching), so a
    // node environment is enough; no DOM/React rendering here.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
