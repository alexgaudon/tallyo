import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  EyeOffIcon,
  FolderIcon,
  GitMergeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StoreIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { CreateMerchantDialog } from "@/components/merchants/create-merchant-dialog";
import { EditMerchantDialog } from "@/components/merchants/edit-merchant-dialog";
import { MergeMerchantForm } from "@/components/merchants/merge-merchant-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { cn, formatCurrency } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type Merchant = Awaited<
  ReturnType<typeof orpc.merchants.getUserMerchants.call>
>[number];
type Category = Awaited<
  ReturnType<typeof orpc.categories.getUserCategories.call>
>["categories"][number];
type MerchantUsage = Awaited<
  ReturnType<typeof orpc.merchants.getMerchantUsage.call>
>[number];
type CategoryUsage = Awaited<
  ReturnType<typeof orpc.categories.getCategoryUsage.call>
>[number];

type TaxonomyTab = "merchants" | "categories";

export const Route = createFileRoute("/_app/taxonomy")({
  component: RouteComponent,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(
        orpc.merchants.getUserMerchants.queryOptions(),
      ),
      queryClient.ensureQueryData(
        orpc.categories.getUserCategories.queryOptions(),
      ),
      queryClient.ensureQueryData(
        orpc.merchants.getMerchantUsage.queryOptions(),
      ),
      queryClient.ensureQueryData(
        orpc.categories.getCategoryUsage.queryOptions(),
      ),
    ]),
});

function formatLastUsed(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d, yyyy");
}

function usageSummary(
  count: number,
  totalAmount: number,
  lastTransactionDate: string | null,
) {
  if (count === 0) return "No activity yet";
  const parts = [
    `${count} ${count === 1 ? "transaction" : "transactions"}`,
    formatCurrency(totalAmount),
  ];
  const lastUsed = formatLastUsed(lastTransactionDate);
  if (lastUsed) parts.push(`last ${lastUsed}`);
  return parts.join(" · ");
}

function DeleteEntityButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${label}`}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MerchantRow({
  merchant,
  usage,
  isApplying,
  onApply,
  onEdit,
  onMerge,
  onDelete,
}: {
  merchant: Merchant;
  usage?: MerchantUsage;
  isApplying: boolean;
  onApply: () => void;
  onEdit: () => void;
  onMerge: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{merchant.name}</span>
        </div>
        <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
          {usage
            ? usageSummary(
                usage.transactionCount,
                usage.totalAmount,
                usage.lastTransactionDate,
              )
            : "No activity yet"}
        </p>
        {merchant.recommendedCategory ? (
          <p className="pl-6 text-xs text-muted-foreground">
            Recommended: {merchant.recommendedCategory.name}
          </p>
        ) : null}
        {merchant.keywords && merchant.keywords.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1 pl-6">
            {merchant.keywords.map((keyword) => (
              <Badge key={keyword.id} variant="outline" className="text-[10px]">
                {keyword.keyword}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={onApply}
          disabled={isApplying}
          aria-label={`Apply ${merchant.name} to matching transactions`}
        >
          <ZapIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label={`Edit ${merchant.name}`}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onMerge}
          aria-label={`Merge ${merchant.name}`}
        >
          <GitMergeIcon className="h-4 w-4" />
        </Button>
        <DeleteEntityButton label={merchant.name} onConfirm={onDelete} />
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  usage,
  onEdit,
  onDelete,
}: {
  category: Category;
  usage?: CategoryUsage;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const Icon = category.icon
    ? // biome-ignore lint: dynamic icon access is required for user-selected icons
      (LucideIcons[category.icon as keyof typeof LucideIcons] as LucideIcon)
    : FolderIcon;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground",
              category.treatAsIncome && "text-income",
            )}
          />
          <span className="truncate font-medium">
            {category.parentCategory
              ? `${category.parentCategory.name} → ${category.name}`
              : category.name}
          </span>
          {category.treatAsIncome ? (
            <Badge variant="success" className="text-[10px]">
              Income
            </Badge>
          ) : null}
          {category.hideFromInsights ? (
            <Badge variant="outline" className="text-[10px]">
              <EyeOffIcon className="h-3 w-3" />
              Hidden
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {usage
            ? usageSummary(
                usage.transactionCount,
                usage.totalAmount,
                usage.lastTransactionDate,
              )
            : "No activity yet"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label={`Edit ${category.name}`}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <DeleteEntityButton label={category.name} onConfirm={onDelete} />
      </div>
    </div>
  );
}

function RouteComponent() {
  const [tab, setTab] = useState<TaxonomyTab>("merchants");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: merchantsData, isLoading: merchantsLoading } = useQuery(
    orpc.merchants.getUserMerchants.queryOptions(),
  );
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    orpc.categories.getUserCategories.queryOptions(),
  );
  const { data: merchantUsageData } = useQuery(
    orpc.merchants.getMerchantUsage.queryOptions(),
  );
  const { data: categoryUsageData } = useQuery(
    orpc.categories.getCategoryUsage.queryOptions(),
  );

  const [createMerchantOpen, setCreateMerchantOpen] = useState(false);
  const [editMerchantId, setEditMerchantId] = useState<string | null>(null);
  const [mergeMerchantId, setMergeMerchantId] = useState<string | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  const merchants = merchantsData ?? [];
  const categories = categoriesData?.categories ?? [];

  const merchantUsageById = useMemo(
    () =>
      new Map((merchantUsageData ?? []).map((row) => [row.merchantId, row])),
    [merchantUsageData],
  );
  const categoryUsageById = useMemo(
    () =>
      new Map((categoryUsageData ?? []).map((row) => [row.categoryId, row])),
    [categoryUsageData],
  );

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: orpc.merchants.getMerchantUsage.queryOptions().queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: orpc.categories.getCategoryUsage.queryOptions().queryKey,
    });
  };

  const { mutateAsync: deleteMerchant } = useMutation(
    orpc.merchants.deleteMerchant.mutationOptions({ onSuccess: refresh }),
  );
  const { mutateAsync: deleteCategory } = useMutation(
    orpc.categories.deleteCategory.mutationOptions({ onSuccess: refresh }),
  );
  const { mutateAsync: applyMerchant, isPending: isApplyingMerchant } =
    useMutation(
      orpc.merchants.applyMerchant.mutationOptions({ onSuccess: refresh }),
    );
  const { mutateAsync: applyAllMerchants, isPending: isApplyingAll } =
    useMutation(orpc.merchants.applyAllMerchants.mutationOptions());

  const handleApplyAllMerchants = async () => {
    try {
      const result = await applyAllMerchants({});
      toast.success(result.message);
    } catch (error) {
      toast.error(
        `Failed to apply all merchants: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const handleApplyMerchant = async (id: string) => {
    try {
      const result = await applyMerchant({ id });
      toast.success(result.message);
    } catch (error) {
      toast.error(
        `Failed to apply merchant: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const filteredMerchants = useMemo(() => {
    if (!searchQuery.trim()) return merchants;
    const query = searchQuery.toLowerCase().trim();
    return merchants.filter((merchant) => {
      if (merchant.name.toLowerCase().includes(query)) return true;
      if (
        merchant.keywords?.some((keyword) =>
          keyword.keyword.toLowerCase().includes(query),
        )
      ) {
        return true;
      }
      if (merchant.recommendedCategory?.name.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [merchants, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    const matchingIds = new Set<string>();
    for (const category of categories) {
      if (
        category.name.toLowerCase().includes(query) ||
        category.icon?.toLowerCase().includes(query)
      ) {
        matchingIds.add(category.id);
      }
    }
    const resultIds = new Set<string>(matchingIds);
    for (const category of categories) {
      if (category.parentCategory && matchingIds.has(category.id)) {
        resultIds.add(category.parentCategory.id);
      }
    }
    return categories.filter((category) => resultIds.has(category.id));
  }, [categories, searchQuery]);

  const mergeMerchant = mergeMerchantId
    ? (merchants.find((merchant) => merchant.id === mergeMerchantId) ?? null)
    : null;

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Vendors & categories"
        title="Taxonomy"
        description="Keep merchants and categories aligned so automatic matching and reports stay trustworthy."
      />

      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 lg:px-8">
        <Panel dense>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search merchants or categories..."
                className="pl-9"
                aria-label="Search taxonomy"
              />
            </div>
            <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 p-0.5">
              {(["merchants", "categories"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTab(option)}
                  aria-pressed={tab === option}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    tab === option
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option} (
                  {option === "merchants"
                    ? merchants.length
                    : categories.length}
                  )
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {tab === "merchants" ? (
          <Panel
            title="Merchants"
            description={`${filteredMerchants.length} of ${merchants.length} merchants`}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyAllMerchants}
                  disabled={
                    isApplyingAll || merchantsLoading || merchants.length === 0
                  }
                >
                  <ZapIcon className="mr-1.5 h-4 w-4" />
                  Apply all
                </Button>
                <Button size="sm" onClick={() => setCreateMerchantOpen(true)}>
                  <PlusIcon className="mr-1.5 h-4 w-4" />
                  New
                </Button>
              </>
            }
          >
            {merchantsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading merchants...
              </p>
            ) : filteredMerchants.length === 0 ? (
              <EmptyState
                compact
                bordered={false}
                icon={<StoreIcon className="h-10 w-10 text-muted-foreground" />}
                title="No merchants found"
                description={
                  searchQuery.trim()
                    ? "Try a different search term."
                    : "Create your first merchant to get started."
                }
              />
            ) : (
              <div className="space-y-2">
                {filteredMerchants.map((merchant) => (
                  <MerchantRow
                    key={merchant.id}
                    merchant={merchant}
                    usage={merchantUsageById.get(merchant.id)}
                    isApplying={isApplyingMerchant}
                    onApply={() => handleApplyMerchant(merchant.id)}
                    onEdit={() => setEditMerchantId(merchant.id)}
                    onMerge={() => setMergeMerchantId(merchant.id)}
                    onDelete={async () => {
                      const result = await deleteMerchant({
                        id: merchant.id,
                      });
                      toast.success(result.message);
                    }}
                  />
                ))}
              </div>
            )}
          </Panel>
        ) : (
          <Panel
            title="Categories"
            description={`${filteredCategories.length} of ${categories.length} categories`}
            actions={
              <Button size="sm" onClick={() => setCreateCategoryOpen(true)}>
                <PlusIcon className="mr-1.5 h-4 w-4" />
                New
              </Button>
            }
          >
            {categoriesLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading categories...
              </p>
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                compact
                bordered={false}
                icon={
                  <FolderIcon className="h-10 w-10 text-muted-foreground" />
                }
                title="No categories found"
                description={
                  searchQuery.trim()
                    ? "Try a different search term."
                    : "Create your first category to get started."
                }
              />
            ) : (
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    usage={categoryUsageById.get(category.id)}
                    onEdit={() => setEditCategoryId(category.id)}
                    onDelete={async () => {
                      await deleteCategory({ id: category.id });
                    }}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>

      <CreateMerchantDialog
        open={createMerchantOpen}
        onOpenChange={setCreateMerchantOpen}
        onSuccess={refresh}
      />

      <EditMerchantDialog
        open={editMerchantId !== null}
        onOpenChange={(open) => {
          if (!open) setEditMerchantId(null);
        }}
        merchantId={editMerchantId ?? ""}
        onSuccess={refresh}
      />

      <CreateCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onSuccess={refresh}
      />

      <EditCategoryDialog
        open={editCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) setEditCategoryId(null);
        }}
        categoryId={editCategoryId ?? ""}
        onSuccess={refresh}
      />

      <Dialog
        open={mergeMerchant !== null}
        onOpenChange={(open) => {
          if (!open) setMergeMerchantId(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Merge Merchant</DialogTitle>
          </DialogHeader>
          {mergeMerchant ? (
            <MergeMerchantForm
              sourceMerchant={mergeMerchant}
              callback={() => {
                setMergeMerchantId(null);
                refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
