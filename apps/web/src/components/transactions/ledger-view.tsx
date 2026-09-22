import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { CreateMerchantDialog } from "@/components/merchants/create-merchant-dialog";
import { EditMerchantDialog } from "@/components/merchants/edit-merchant-dialog";
import { ReviewCard } from "@/components/transactions/review-card";
import { SplitTransactionDialog } from "@/components/transactions/split-transaction-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { ViewControls } from "@/components/transactions/view-controls";
import { type PaginationInfo, Paginator } from "@/components/ui/paginator";
import { Panel } from "@/components/ui/panel";
import {
  type LedgerTransaction,
  useTransactionMutations,
} from "@/hooks/use-transaction-mutations";
import {
  hasActiveViewFilters,
  type ViewScope,
  type ViewSearch,
  viewQueryOptions,
} from "@/lib/transaction-view";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export interface LedgerViewProps {
  /** The view to render. The parent owns where this state lives (URL or lens). */
  view: ViewSearch;
  /** Called with a complete next view whenever filters or pagination change. */
  onViewChange: (next: ViewSearch) => void;
  /** Query scope; the ledger defaults to `"ledger"`. */
  scope?: ViewScope;
  /** Tighter vertical rhythm and padding, used by lenses. */
  dense?: boolean;
  /**
   * Collapse the filter controls behind a "Filters" disclosure (with a
   * chevron) instead of showing them inline. Used by the mobile lens so it
   * opens minimal rather than dumping the whole filter wall.
   */
  collapsibleFilters?: boolean;
  className?: string;
}

/**
 * The ledger body — view controls, review queue, transaction list, paginator —
 * driven entirely by the `view` prop. The full `/transactions` route feeds it
 * the URL search and navigates on change; a lens feeds it local state. It owns
 * the same edit/create dialogs and mutations either way so behaviour is
 * identical across surfaces.
 */
export function LedgerView({
  view,
  onViewChange,
  scope = "ledger",
  dense = false,
  collapsibleFilters = false,
  className,
}: LedgerViewProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery(viewQueryOptions(view, scope));
  const mutations = useTransactionMutations(view, scope);

  const [editMerchant, setEditMerchant] = useState<{
    open: boolean;
    merchantId: string;
  }>({ open: false, merchantId: "" });
  const [editCategory, setEditCategory] = useState<{
    open: boolean;
    categoryId: string;
  }>({ open: false, categoryId: "" });
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createMerchantOpen, setCreateMerchantOpen] = useState(false);
  const [splitDialog, setSplitDialog] = useState<{
    open: boolean;
    transaction: LedgerTransaction | null;
  }>({ open: false, transaction: null });

  const transactions = data?.transactions ?? [];
  const pagination: PaginationInfo = data?.pagination ?? {
    total: 0,
    page: view.page,
    pageSize: view.pageSize,
    totalPages: 1,
  };

  const reviewing = view.review === "unreviewed";
  const viewKey = viewQueryOptions(view, scope).queryKey;

  const refreshView = () => {
    queryClient.invalidateQueries({ queryKey: viewKey });
    queryClient.invalidateQueries({
      queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
    });
  };

  return (
    <div className={cn(dense ? "space-y-4" : "space-y-6", className)}>
      {collapsibleFilters ? (
        <FilterDisclosure view={view} onViewChange={onViewChange} />
      ) : (
        <Panel dense>
          <ViewControls view={view} onViewChange={onViewChange} />
        </Panel>
      )}

      {reviewing && transactions.length > 0 ? (
        <ReviewCard
          transactions={transactions}
          mutations={mutations}
          onEditMerchant={(merchantId) =>
            setEditMerchant({ open: true, merchantId })
          }
          onEditCategory={(categoryId) =>
            setEditCategory({ open: true, categoryId })
          }
          onCreateMerchant={() => setCreateMerchantOpen(true)}
          onCreateCategory={() => setCreateCategoryOpen(true)}
        />
      ) : null}

      <Panel className="gap-0 overflow-hidden p-0">
        <TransactionList
          transactions={transactions}
          hasActiveFilters={hasActiveViewFilters(view)}
          reviewOnly={reviewing}
          mutations={mutations}
          onCustomSplit={(transaction) =>
            setSplitDialog({ open: true, transaction })
          }
          onEditMerchant={(merchantId) =>
            setEditMerchant({ open: true, merchantId })
          }
          onEditCategory={(categoryId) =>
            setEditCategory({ open: true, categoryId })
          }
          onCreateMerchant={() => setCreateMerchantOpen(true)}
          onCreateCategory={() => setCreateCategoryOpen(true)}
          onMerchantClick={(merchantId) =>
            onViewChange({ ...view, merchants: [merchantId], page: 1 })
          }
          onCategoryClick={(categoryId) =>
            onViewChange({ ...view, categories: [categoryId], page: 1 })
          }
        />
      </Panel>

      <Paginator
        pagination={pagination}
        onPageChange={(page) => onViewChange({ ...view, page })}
        onPageSizeChange={(pageSize) =>
          onViewChange({ ...view, pageSize, page: 1 })
        }
      />

      <EditMerchantDialog
        open={editMerchant.open}
        onOpenChange={(open) =>
          setEditMerchant({ open, merchantId: editMerchant.merchantId })
        }
        merchantId={editMerchant.merchantId}
        onSuccess={refreshView}
      />

      <EditCategoryDialog
        open={editCategory.open}
        onOpenChange={(open) =>
          setEditCategory({ open, categoryId: editCategory.categoryId })
        }
        categoryId={editCategory.categoryId}
        onSuccess={refreshView}
      />

      <CreateMerchantDialog
        open={createMerchantOpen}
        onOpenChange={setCreateMerchantOpen}
        onSuccess={() =>
          queryClient.invalidateQueries({
            queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
          })
        }
      />

      <CreateCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onSuccess={() =>
          queryClient.invalidateQueries({
            queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
          })
        }
      />

      <SplitTransactionDialog
        open={splitDialog.open}
        onOpenChange={(open) =>
          setSplitDialog({
            open,
            transaction: open ? splitDialog.transaction : null,
          })
        }
        transaction={splitDialog.transaction}
        queryKey={viewKey}
      />
    </div>
  );
}

function activeFilterCount(view: ViewSearch): number {
  return (
    (view.categories?.length ?? 0) +
    (view.merchants?.length ?? 0) +
    (view.q ? 1 : 0) +
    (view.review !== "all" ? 1 : 0) +
    (view.side !== "all" ? 1 : 0) +
    (view.noMerchant ? 1 : 0) +
    (view.min !== undefined ? 1 : 0) +
    (view.max !== undefined ? 1 : 0)
  );
}

/**
 * Minimal, collapsed filter bar for tight surfaces (the mobile lens). The full
 * controls stay one tap away behind the chevron, and an active count keeps the
 * collapsed state honest.
 */
function FilterDisclosure({
  view,
  onViewChange,
}: {
  view: ViewSearch;
  onViewChange: (next: ViewSearch) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(view);

  return (
    <Panel dense className="gap-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span>Filters</span>
          {count > 0 ? (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="pt-3">
          <ViewControls view={view} onViewChange={onViewChange} />
        </div>
      ) : null}
    </Panel>
  );
}
