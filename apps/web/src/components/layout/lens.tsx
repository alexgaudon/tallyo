import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { LedgerView } from "@/components/transactions/ledger-view";
import { Button } from "@/components/ui/button";
import { EntityPickerProvider } from "@/components/ui/entity-picker-sheet";
import type { ViewSearch } from "@/lib/transaction-view";
import { cn } from "@/lib/utils";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export interface TransactionsLensProps {
  title: string;
  description?: string;
  /** The lens view; the parent owns it (URL search params), not this component. */
  view: ViewSearch;
  /** Persist a filter/page change. */
  onViewChange: (next: ViewSearch) => void;
  /** Dismiss the lens. */
  onClose: () => void;
}

/**
 * A drill-down lens rendered over the canvas. It is URL-owned: the parent route
 * derives `view` from search params and persists every change, so a lens is
 * deep-linkable and the browser Back button dismisses it.
 */
export function TransactionsLens({
  title,
  description,
  view,
  onViewChange,
  onClose,
}: TransactionsLensProps) {
  const isDesktop = useIsDesktop();

  const header = (
    <header className="flex items-start justify-between gap-3 border-b border-glass-border px-4 py-4">
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="outline" size="sm" onClick={onClose}>
          <Link to="/transactions" search={view}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open full page</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close lens"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );

  const body = (
    <EntityPickerProvider>
      <LedgerView
        view={view}
        onViewChange={onViewChange}
        dense
        collapsibleFilters={!isDesktop}
      />
    </EntityPickerProvider>
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="motion-fade fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "glass-strong motion-lens fixed inset-y-0 right-0 z-50 flex w-full max-w-[52rem] flex-col border-l border-glass-border shadow-glass-lg outline-hidden",
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              {title}
            </DialogPrimitive.Title>
            {header}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
              {body}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <DrawerPrimitive.Root
      open
      onOpenChange={handleOpenChange}
      direction="bottom"
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          // Fixed to the layout viewport (inset-0) rather than h-dvh: on iOS the
          // on-screen keyboard shrinks dvh, which collapsed the sheet to half
          // height whenever a field was focused.
          className="glass-strong fixed inset-0 z-50 flex flex-col rounded-t-2xl border-t border-glass-border outline-hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DrawerPrimitive.Title className="sr-only">
            {title}
          </DrawerPrimitive.Title>
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-foreground/20" />
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
            {body}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
