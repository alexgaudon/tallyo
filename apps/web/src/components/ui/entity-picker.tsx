import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  GitMergeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { findMerchantsMatchingDetails } from "@/lib/merchant-suggestions";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type EntityPickerKind = "merchant" | "category";

export interface EntityPickerProps {
  kind: EntityPickerKind;
  value?: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Surface a create affordance; the caller owns the dialog. */
  allowCreate?: boolean;
  /** Surface an edit affordance; the caller owns the dialog. */
  allowEdit?: boolean;
  /** Surface a merge affordance; the caller owns the dialog. */
  allowMerge?: boolean;
  /** Surface a clear affordance for single-value selection. */
  allowClear?: boolean;
  onCreate?: () => void;
  onEdit?: (id: string) => void;
  onMerge?: (id: string) => void;
  className?: string;
  /** Used to prioritize merchants that match a bank/import description. */
  transactionDetails?: string;
}

interface PickerEntity {
  id: string;
  name: string;
  parentName: string | null;
}

interface PickerAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

/**
 * The single entity selector for both merchants and categories. It renders a
 * Popover + Command on desktop and a Drawer on mobile, and deliberately does
 * not own any create/edit/merge dialog: it only surfaces the callbacks so the
 * consumer stays in control of those flows.
 */
export function EntityPicker({
  kind,
  value,
  onChange,
  multiple = false,
  placeholder,
  disabled = false,
  allowCreate = false,
  allowEdit = false,
  allowMerge = false,
  allowClear = false,
  onCreate,
  onEdit,
  onMerge,
  className,
  transactionDetails,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const merchantsQuery = useQuery({
    ...orpc.merchants.getUserMerchants.queryOptions(),
    enabled: kind === "merchant",
  });
  const categoriesQuery = useQuery({
    ...orpc.categories.getUserCategories.queryOptions(),
    enabled: kind === "category",
  });

  const entities = useMemo<PickerEntity[]>(() => {
    if (kind === "merchant") {
      return (merchantsQuery.data ?? []).map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        parentName: null,
      }));
    }
    return (categoriesQuery.data?.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      parentName: category.parentCategory?.name ?? null,
    }));
  }, [kind, merchantsQuery.data, categoriesQuery.data]);

  const priorityIds = useMemo(() => {
    if (kind !== "merchant" || !transactionDetails) return [];
    return findMerchantsMatchingDetails(
      merchantsQuery.data ?? [],
      transactionDetails,
    ).map((merchant) => merchant.id);
  }, [kind, transactionDetails, merchantsQuery.data]);

  const sortedEntities = useMemo(() => {
    if (priorityIds.length === 0) return entities;
    const priority = new Set(priorityIds);
    return [
      ...entities.filter((entity) => priority.has(entity.id)),
      ...entities.filter((entity) => !priority.has(entity.id)),
    ];
  }, [entities, priorityIds]);

  const selectedIds = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return typeof value === "string" && value ? [value] : [];
  }, [multiple, value]);

  const selectedEntities = useMemo(
    () => entities.filter((entity) => selectedIds.includes(entity.id)),
    [entities, selectedIds],
  );
  const singleSelected = selectedEntities[0];
  const [firstSelectedEntity] = selectedEntities;

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedEntities;
    return sortedEntities.filter((entity) =>
      `${entity.parentName ?? ""} ${entity.name}`.toLowerCase().includes(query),
    );
  }, [sortedEntities, search]);

  const noun = kind === "merchant" ? "merchant" : "category";
  const nounPlural = kind === "merchant" ? "merchants" : "categories";
  const resolvedPlaceholder =
    placeholder ??
    (multiple
      ? kind === "merchant"
        ? "All merchants"
        : "All categories"
      : kind === "merchant"
        ? "Select merchant..."
        : "Select category...");
  const searchPlaceholder = `Search ${nounPlural}...`;

  const formatEntity = (entity: PickerEntity): ReactNode => {
    if (entity.parentName) {
      return (
        <span className="flex items-center gap-1">
          {entity.parentName}
          <ArrowRightIcon className="h-3 w-3 shrink-0 opacity-70" />
          {entity.name}
        </span>
      );
    }
    return entity.name;
  };

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  const handleSelect = (id: string) => {
    if (multiple) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id];
      onChange(next);
      return;
    }
    onChange(id);
    close();
  };

  const actions: PickerAction[] = [];
  if (allowCreate && onCreate) {
    actions.push({
      label: `Create new ${noun}`,
      icon: <PlusIcon />,
      onClick: onCreate,
    });
  }
  if (allowEdit && onEdit && firstSelectedEntity) {
    actions.push({
      label: `Edit ${noun}`,
      icon: <PencilIcon />,
      onClick: () => onEdit(firstSelectedEntity.id),
    });
  }
  if (allowMerge && onMerge && firstSelectedEntity) {
    actions.push({
      label: `Merge ${noun}`,
      icon: <GitMergeIcon />,
      onClick: () => onMerge(firstSelectedEntity.id),
    });
  }
  if (allowClear && !multiple && singleSelected) {
    actions.push({
      label: `Clear ${noun}`,
      icon: <XIcon />,
      onClick: () => onChange(null),
    });
  }

  const trigger = (
    <Button
      variant="outline"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn(
        "min-h-10 w-full justify-between gap-2 border-input/50 text-sm",
        !selectedEntities.length && "text-muted-foreground",
        className,
      )}
      disabled={disabled}
    >
      {multiple ? (
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {selectedEntities.length === 0 ? (
            <span className="truncate">{resolvedPlaceholder}</span>
          ) : selectedEntities.length <= 2 ? (
            selectedEntities.map((entity) => (
              <Badge key={entity.id} variant="secondary" className="text-xs">
                {formatEntity(entity)}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(selectedIds.filter((id) => id !== entity.id));
                  }}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 touch-manipulation"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <>
              <Badge variant="secondary" className="text-xs">
                {formatEntity(selectedEntities[0])}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(
                      selectedIds.filter((id) => id !== selectedEntities[0].id),
                    );
                  }}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 touch-manipulation"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
              <span className="text-muted-foreground">
                +{selectedEntities.length - 1} more
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1 truncate text-left">
          {singleSelected ? formatEntity(singleSelected) : resolvedPlaceholder}
        </div>
      )}
      <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
    </Button>
  );

  const listBody = (
    <>
      {filteredEntities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No {nounPlural} available
        </p>
      ) : null}
      {filteredEntities.map((entity) => {
        const selected = selectedIds.includes(entity.id);
        return (
          <button
            key={entity.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted/60 active:bg-muted",
              selected && "bg-muted/50",
            )}
            onClick={() => handleSelect(entity.id)}
          >
            <CheckIcon
              className={cn(
                "h-4 w-4 shrink-0",
                selected ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="min-w-0 flex-1 wrap-break-word">
              {formatEntity(entity)}
            </span>
          </button>
        );
      })}
    </>
  );

  const actionButtons = actions.length > 0 && (
    <div className="shrink-0 space-y-1 border-t p-2">
      {actions.map((action, index) => (
        <Button
          key={`${action.label}-${index}`}
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            action.onClick();
            close();
          }}
        >
          {action.icon ? (
            <span className="mr-2 h-3 w-3">{action.icon}</span>
          ) : null}
          {action.label}
        </Button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
          else setOpen(true);
        }}
        direction="bottom"
        shouldScaleBackground={false}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent
          className="flex w-full flex-col rounded-t-xl border-t border-border bg-popover text-popover-foreground"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DrawerHeader className="shrink-0 pb-2 pt-3 text-left">
            <DrawerTitle className="text-base">Choose {noun}</DrawerTitle>
          </DrawerHeader>
          <div className="shrink-0 border-b border-border px-3 pb-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 pl-9 text-base"
                autoFocus
              />
            </div>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{ maxHeight: "min(60dvh, 480px)" }}
          >
            {allowCreate && onCreate ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-base text-primary hover:bg-muted/60 active:bg-muted"
                onClick={() => {
                  onCreate();
                  close();
                }}
              >
                <PlusIcon className="h-4 w-4 shrink-0" />
                Create new {noun}
              </button>
            ) : null}
            <div className="py-1">{listBody}</div>
          </div>
          {actionButtons}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else setOpen(true);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      {open ? (
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] max-w-[calc(100vw-2rem)] p-0"
        >
          <Command
            shouldFilter={false}
            className="flex max-h-[340px] w-full flex-col"
          >
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-10 shrink-0 text-base"
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList className="flex-1 overflow-auto">
              <CommandGroup>
                {allowCreate && onCreate ? (
                  <CommandItem
                    value={`create-new-${noun}`}
                    onSelect={() => {
                      onCreate();
                      close();
                    }}
                    className="flex min-h-9 items-center gap-2 text-sm text-primary"
                  >
                    <PlusIcon className="h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1 wrap-break-word">
                      Create new {noun}
                    </div>
                  </CommandItem>
                ) : null}
                {filteredEntities.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No {nounPlural} available
                  </div>
                ) : null}
                {filteredEntities.map((entity) => {
                  const selected = selectedIds.includes(entity.id);
                  return (
                    <CommandItem
                      key={entity.id}
                      value={entity.id}
                      onSelect={() => handleSelect(entity.id)}
                      className="flex min-h-9 items-center gap-2 text-sm"
                    >
                      <CheckIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1 wrap-break-word">
                        {formatEntity(entity)}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {actionButtons}
          </Command>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
