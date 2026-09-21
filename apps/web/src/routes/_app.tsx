import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import Footer from "@/components/footer";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { TopNav } from "@/components/layout/top-nav";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: "/signin",
        search: { from: location.pathname },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <TopNav onMenuClick={() => setMobileDrawerOpen(true)} />
      <MobileNavDrawer
        open={mobileDrawerOpen}
        onOpenChange={setMobileDrawerOpen}
      />
      <main className="flex-1 bg-muted/20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
