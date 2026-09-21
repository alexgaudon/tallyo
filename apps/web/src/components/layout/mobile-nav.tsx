import { Link, useLocation } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { isNavActive, navItems, settingsNavItem } from "@/lib/nav";

/**
 * Mobile side navigation. A burger in the top-left header opens this drawer;
 * it is the mobile counterpart of the desktop rail and uses the same nav
 * config so the two never drift.
 */
export function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const location = useLocation();
  const close = () => onOpenChange(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent className="w-72 max-w-[82vw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>

        <div className="flex h-16 items-center px-5">
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-2.5"
            aria-label="Tallyo home"
          >
            <img src="/favicon.ico" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Tallyo
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {[...navItems, settingsNavItem].map((item) => {
            const isActive = isNavActive(location.pathname, item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "flex items-center gap-3 rounded-xl bg-accent/10 px-3 py-3 text-sm font-medium text-accent transition-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/75 transition-soft hover:bg-secondary/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center justify-between border-t border-glass-border px-4 py-3">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ModeToggle />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
