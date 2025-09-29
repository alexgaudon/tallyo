import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), TanStackRouterVite({}), react()],
	define: {
		"import.meta.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
	},
	base: process.env.NODE_ENV === "production" ? "/" : "/",
	server: {
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
					tanstack: [
						"@tanstack/react-router",
						"@tanstack/react-query",
						"@tanstack/react-form",
					],
					// Radix UI components
					radix: [
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
});
