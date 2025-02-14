import react from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config({
  ignores: [
    "dist",
    ".vinxi",
    ".wrangler",
    ".vercel",
    ".netlify",
    ".output",
    "build/",
  ],
  files: ["**/*.{ts,tsx}"],
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
    ...pluginQuery.configs["flat/recommended"],
    ...pluginRouter.configs["flat/recommended"],
  ],
  languageOptions: {
    globals: {
      ...globals.browser,
    },
    parserOptions: {
      parser: tseslint.parser,
      project: "./tsconfig.json",
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    "react-hooks": reactHooks,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    "@eslint-react/no-nested-components": "off",
  },
  ...react.configs["recommended-type-checked"],
});
