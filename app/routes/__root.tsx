import { type QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  ScriptOnce,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import React from "react";

import Navbar from "@/components/NavBar";
import { ThemeProvider } from "@/components/theme-provider";

import { PrivacyModeProvider } from "@/components/toggle-privacy-mode";
import { UnreviewedBanner } from "@/components/transactions/unreviewed-banner";
import icon from "@/favicon.ico?url";
import { AuthRepository } from "@/repositories/auth";
import { MetaRepository } from "@/repositories/meta";
import appCss from "@/styles/app.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    beforeLoad: async (ctx) => {
      const [auth, meta] = await Promise.all([
        await ctx.context.queryClient.ensureQueryData(
          AuthRepository.getUserAuthQuery(),
        ),
        await ctx.context.queryClient.ensureQueryData(
          MetaRepository.getUserMeta(),
        ),
      ]);
      return { auth, meta };
    },
    loader: async () => {},
    component: RootComponent,
    head: () => {
      return {
        meta: [
          {
            charSet: "utf-8",
          },
          {
            name: "viewport",
            content:
              "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
          },
          {
            title: "Tallyo | Personal Finance",
          },
        ],
        links: [
          {
            rel: "stylesheet",
            href: appCss,
          },
          {
            rel: "icon",
            type: "image/x-icon",
            // href: "/images/favicon.ico",
            href: icon,
          },
        ],
        head: [],
      };
    },
  },
);

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      })),
    );

const TanStackQueryDevTools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import("@tanstack/react-query-devtools").then((res) => ({
        default: res.ReactQueryDevtools,
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      })),
    );

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta name="darkreader-lock" />
        {import.meta.env.SSR && import.meta.env.PROD && (
          <script
            defer
            data-domain="tallyo.app"
            src="https://pl.amgau.com/js/script.js"
          ></script>
        )}
        <Meta />
      </head>
      <body suppressHydrationWarning className="h-screen">
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <UnreviewedBanner />
          <Navbar />
          <PrivacyModeProvider>{children}</PrivacyModeProvider>
        </ThemeProvider>
        <TanStackRouterDevtools position="bottom-right" />
        {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
        <TanStackQueryDevTools buttonPosition="bottom-left" />
        <Scripts />
        {}
        <ScriptOnce>
          {`document.documentElement.classList.toggle(
                      'dark',
                      localStorage['vite-ui-theme'] === 'dark' || (!('vite-ui-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
                      )`}
        </ScriptOnce>
      </body>
    </html>
  );
}
