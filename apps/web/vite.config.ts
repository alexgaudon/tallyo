import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), TanStackRouterVite({}), react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// Split vendor chunks
					"react-vendor": ["react", "react-dom"],
					"ui-vendor": [
						"@radix-ui/react-alert-dialog",
						"@radix-ui/react-avatar",
						"@radix-ui/react-checkbox",
						"@radix-ui/react-dialog",
						"@radix-ui/react-dropdown-menu",
						"@radix-ui/react-label",
						"@radix-ui/react-popover",
						"@radix-ui/react-select",
						"@radix-ui/react-separator",
						"@radix-ui/react-slot",
						"@radix-ui/react-switch",
					],
					"form-vendor": [
						"@tanstack/react-form",
						"react-hook-form",
						"@hookform/resolvers",
						"zod",
					],
					"query-vendor": ["@tanstack/react-query", "@orpc/react-query"],
				},
			},
		},
		// Enable minification
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
		},
		// Enable source maps in production for better debugging
		sourcemap: true,
		// Ensure CSS is also minified
		cssMinify: true,
	},
});
