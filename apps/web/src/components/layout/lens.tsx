import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { LedgerView } from "@/components/transactions/ledger-view";
import { Button } from "@/components/ui/button";
import { EntityPickerProvider } from "@/components/ui/entity-picker-sheet";
import type { ViewSearch } from "@/lib/transaction-view";
import { cn } from "@/lib/utils";

/** At most two lenses are kept on the stack; pushing a third drops the oldest. */
const MAX_LENS_DEPTH = 2;

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

export interface TransactionsLensSpec {
  kind: "transactions";
  /** Heading shown in the lens chrome. */
  title: string;
  description?: string;
  /** The initial view; the lens owns it from here and filters/pages locally. */
  view: ViewSearch;
}

export type LensSpec = TransactionsLensSpec;

interface LensEntry {
  id: string;
  spec: LensSpec;
}

interface LensContextValue {
  stack: LensEntry[];
  openLens: (spec: LensSpec) => void;
  closeLens: () => void;
  closeAllLenses: () => void;
}

const LensContext = createContext<LensContextValue | null>(null);

export function useLens() {
  const context = useContext(LensContext);
  if (!context) {
    throw new Error("useLens must be used within a LensProvider");
  }
  return context;
}

let lensCounter = 0;
function nextLensId() {
  lensCounter += 1;
  return `lens-${lensCounter}`;
}

/**
 * Holds the lens stack. Lenses layer over the persistent canvas instead of
 * navigating away; the underlying route stays mounted and untouched.
 */
export function LensProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<LensEntry[]>([]);

  const openLens = useCallback((spec: LensSpec) => {
    setStack((prev) =>
      [...prev, { id: nextLensId(), spec }].slice(-MAX_LENS_DEPTH),
    );
  }, []);

  const closeLens = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const closeAllLenses = useCallback(() => setStack([]), []);

  const value = useMemo(
    () => ({ stack, openLens, closeLens, closeAllLenses }),
    [stack, openLens, closeLens, closeAllLenses],
  );

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

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

/**
 * Renders the active lens. Only the top of the stack is surfaced so focus and
 * Escape always belong to a single surface; closing it reveals the one below.
 */
export function LensHost() {
  const { stack, closeLens } = useLens();
  const isDesktop = useIsDesktop();
  const top = stack[stack.length - 1];

  if (!top) return null;

  return (
    <LensInstance
      key={top.id}
      spec={top.spec}
      isDesktop={isDesktop}
      onClose={closeLens}
    />
  );
}

function LensInstance({
  spec,
  isDesktop,
  onClose,
}: {
  spec: LensSpec;
  isDesktop: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<ViewSearch>(spec.view);

  const header = (
    <header className="flex items-start justify-between gap-3 border-b border-glass-border px-4 py-4">
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold text-foreground">
          {spec.title}
        </h2>
        {spec.description ? (
          <p className="text-xs text-muted-foreground">{spec.description}</p>
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
      <LedgerView view={view} onViewChange={setView} dense />
    </EntityPickerProvider>
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "glass-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-[52rem] flex-col border-l border-glass-border shadow-glass-lg outline-hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              {spec.title}
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
          className="glass-strong fixed inset-x-0 bottom-0 z-50 flex h-dvh max-h-dvh flex-col rounded-t-2xl border-t border-glass-border outline-hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DrawerPrimitive.Title className="sr-only">
            {spec.title}
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
