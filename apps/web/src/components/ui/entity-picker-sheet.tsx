import { CheckIcon, PlusIcon, SearchIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickerEntity {
  id: string;
  name: string;
}

export interface PickerActionButton {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  disabled?: boolean;
}

interface OpenPickerOptions<T extends PickerEntity> {
  entities: T[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  title?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  formatEntity?: (entity: T) => ReactNode;
  prioritizeEntityIds?: string[];
  showCreateOption?: boolean;
  createOptionLabel?: string;
  onCreateClick?: () => void;
  actionButtons?: PickerActionButton[];
}

interface EntityPickerContextValue {
  openPicker: <T extends PickerEntity>(options: OpenPickerOptions<T>) => void;
}

const EntityPickerContext = createContext<EntityPickerContextValue | null>(
  null,
);

export function useEntityPicker() {
  const ctx = useContext(EntityPickerContext);
  return ctx;
}

function sortWithPriority<T extends PickerEntity>(
  entities: T[],
  priorityIds: string[],
): T[] {
  if (priorityIds.length === 0) return entities;
  const prioritySet = new Set(priorityIds);
  const prioritized = entities.filter((e) => prioritySet.has(e.id));
  const rest = entities.filter((e) => !prioritySet.has(e.id));
  return [...prioritized, ...rest];
}

function filterEntities<T extends PickerEntity>(
  entities: T[],
  query: string,
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return entities;
  return entities.filter((e) => e.name.toLowerCase().includes(trimmed));
}

export function EntityPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState<OpenPickerOptions<PickerEntity> | null>(
    null,
  );

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setConfig(null);
  }, []);

  const openPicker = useCallback(
    <T extends PickerEntity>(options: OpenPickerOptions<T>) => {
      setConfig(options as unknown as OpenPickerOptions<PickerEntity>);
      setSearch("");
      setOpen(true);
    },
    [],
  );

  const sortedEntities = useMemo(() => {
    if (!config) return [];
    return sortWithPriority(
      config.entities,
      config.prioritizeEntityIds ?? [],
    );
  }, [config]);

  const filteredEntities = useMemo(
    () => filterEntities(sortedEntities, search),
    [sortedEntities, search],
  );

  const formatEntity = config?.formatEntity ?? ((e: PickerEntity) => e.name);

  const handleSelect = (id: string) => {
    config?.onValueChange(id);
    close();
  };

  return (
    <EntityPickerContext.Provider value={{ openPicker }}>
      {children}
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        direction="bottom"
        shouldScaleBackground={false}
      >
        {config ? (
          <DrawerContent
            className={cn(
              "flex flex-col rounded-t-xl border-t border-border w-full inset-x-0 max-h-[85dvh]",
              "bg-popover text-popover-foreground",
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {config.title ? (
              <DrawerHeader className="pb-2 pt-3 text-left shrink-0">
                <DrawerTitle className="text-base">{config.title}</DrawerTitle>
              </DrawerHeader>
            ) : null}

            <div className="px-3 pb-2 shrink-0 border-b border-border">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={config.searchPlaceholder ?? "Search..."}
                  className="h-10 pl-9 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
              style={{ maxHeight: "min(60dvh, 480px)" }}
            >
              {config.showCreateOption && config.onCreateClick ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-base text-blue-600 hover:bg-muted/60 active:bg-muted"
                  onClick={() => {
                    config.onCreateClick?.();
                    close();
                  }}
                >
                  <PlusIcon className="h-4 w-4 shrink-0" />
                  {config.createOptionLabel ?? "Create new..."}
                </button>
              ) : null}

              {filteredEntities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {config.emptyLabel ?? "No items available"}
                </p>
              ) : (
                <ul className="py-1">
                  {filteredEntities.map((entity) => {
                    const selected = config.value === entity.id;
                    return (
                      <li key={entity.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 px-4 py-3 text-left text-base active:bg-muted",
                            selected ? "bg-muted/80" : "hover:bg-muted/60",
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {config.actionButtons && config.actionButtons.length > 0 ? (
              <div className="border-t p-2 space-y-1 shrink-0">
                {config.actionButtons.map((action, index) => (
                  <Button
                    key={`${action.label}-${index}`}
                    variant={action.variant || "ghost"}
                    size="sm"
                    className="w-full justify-start min-h-10"
                    onClick={() => {
                      action.onClick();
                      close();
                    }}
                    disabled={action.disabled}
                  >
                    {action.icon ? (
                      <span className="mr-2 h-3 w-3">{action.icon}</span>
                    ) : null}
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </DrawerContent>
        ) : null}
      </Drawer>
    </EntityPickerContext.Provider>
  );
}
