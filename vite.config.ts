import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    printWidth: 80,
  },
  lint: {
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "**/components/ui/**",
      "**/dist/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    plugins: ["typescript", "unicorn", "oxc", "react"],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    options: { typeAware: true, typeCheck: true },
  },
  staged: {
    "*.{js,jsx,ts,tsx,mjs,cjs,css,html}": "vp check --fix",
  },
  test: {
    projects: ["apps/web", "apps/server"],
  },
});
