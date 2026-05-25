import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SearchIcon } from "lucide-react";
import {
	memo,
	useCallback,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { useEntityPicker } from "@/components/ui/entity-picker-sheet";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Entity {
	id: string;
	name: string;
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| { [key: string]: unknown };
}

interface ActionButton {
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

interface EntitySelectProps<T extends Entity> {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	placeholder?: string;
	className?: string;
	entities: T[];
	formatEntity?: (entity: T) => ReactNode;
	emptyLabel?: string;
	disabled?: boolean;
	searchPlaceholder?: string;
	showCreateOption?: boolean;
	createOptionLabel?: string;
	onCreateClick?: () => void;
	actionButtons?: ActionButton[];
	showActionButtons?: boolean;
	popoverWidth?: string;
	drawerTitle?: string;
	prioritizeEntityIds?: string[];
}

function sortWithPriority<T extends Entity>(
	entities: T[],
	priorityIds: string[],
): T[] {
	if (priorityIds.length === 0) return entities;
	const prioritySet = new Set(priorityIds);
	return [
		...entities.filter((e) => prioritySet.has(e.id)),
		...entities.filter((e) => !prioritySet.has(e.id)),
	];
}

function filterBySearch<T extends Entity>(entities: T[], query: string): T[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return entities;
	return entities.filter((e) => e.name.toLowerCase().includes(trimmed));
}

interface MobileEntityListProps<T extends Entity> {
	entities: T[];
	value?: string | null;
	searchValue: string;
	onSearchChange: (value: string) => void;
	onSelect: (id: string) => void;
	formatEntity: (entity: T) => ReactNode;
	emptyLabel: string;
	searchPlaceholder: string;
	showCreateOption: boolean;
	createOptionLabel: string;
	onCreateClick?: () => void;
	actionButtons: ActionButton[];
	showActionButtons: boolean;
}

function MobileEntityList<T extends Entity>({
	entities,
	value,
	searchValue,
	onSearchChange,
	onSelect,
	formatEntity,
	emptyLabel,
	searchPlaceholder,
	showCreateOption,
	createOptionLabel,
	onCreateClick,
	actionButtons,
	showActionButtons,
}: MobileEntityListProps<T>) {
	const filtered = useMemo(
		() => filterBySearch(entities, searchValue),
		[entities, searchValue],
	);

	return (
		<>
			<div className="px-3 pb-2 shrink-0 border-b border-border">
				<div className="relative">
					<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<Input
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder={searchPlaceholder}
						className="h-10 pl-9 text-base"
					/>
				</div>
			</div>
			<div
				className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
				style={{ maxHeight: "min(60dvh, 480px)" }}
			>
				{showCreateOption && onCreateClick ? (
					<button
						type="button"
						className="flex w-full items-center gap-2 px-4 py-3 text-left text-base text-blue-600 hover:bg-muted/60 active:bg-muted"
						onClick={() => onCreateClick()}
					>
						<PlusIcon className="h-4 w-4 shrink-0" />
						{createOptionLabel}
					</button>
				) : null}
				{filtered.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						{emptyLabel}
					</p>
				) : (
					<ul className="py-1">
						{filtered.map((entity) => {
							const selected = value === entity.id;
							return (
								<li key={entity.id}>
									<button
										type="button"
										className={cn(
											"flex w-full items-center gap-2 px-4 py-3 text-left text-base active:bg-muted",
											selected ? "bg-muted/80" : "hover:bg-muted/60",
										)}
										onClick={() => onSelect(entity.id)}
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
			{showActionButtons && actionButtons.length > 0 ? (
				<div className="border-t p-2 space-y-1 shrink-0">
					{actionButtons.map((action, index) => (
						<Button
							key={`${action.label}-${index}`}
							variant={action.variant || "ghost"}
							size="sm"
							className="w-full justify-start min-h-10"
							onClick={action.onClick}
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
		</>
	);
}

function EntitySelectInner<T extends Entity>({
	value,
	onValueChange,
	placeholder = "Select an item",
	className,
	entities,
	formatEntity = (entity) => entity.name,
	emptyLabel = "No items available",
	disabled = false,
	searchPlaceholder = "Search...",
	showCreateOption = false,
	createOptionLabel = "Create new...",
	onCreateClick,
	actionButtons = [],
	showActionButtons = false,
	popoverWidth = "w-[400px]",
	drawerTitle,
	prioritizeEntityIds = [],
}: EntitySelectProps<T>) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const isMobile = useIsMobile();
	const entityPicker = useEntityPicker();

	const sortedEntities = useMemo(
		() => sortWithPriority(entities, prioritizeEntityIds),
		[entities, prioritizeEntityIds],
	);

	const selectedEntity = useMemo(
		() => (value ? entities.find((entity) => entity.id === value) : null),
		[entities, value],
	);

	const handleClose = useCallback(() => {
		setOpen(false);
		setSearchValue("");
	}, []);

	const handleSelect = useCallback(
		(id: string) => {
			onValueChange(id);
			handleClose();
		},
		[onValueChange, handleClose],
	);

	const openSharedPicker = useCallback(() => {
		if (!entityPicker) return;
		entityPicker.openPicker({
			entities: sortedEntities,
			value,
			onValueChange,
			title: drawerTitle,
			searchPlaceholder,
			emptyLabel,
			formatEntity,
			prioritizeEntityIds,
			showCreateOption,
			createOptionLabel,
			onCreateClick,
			actionButtons,
		});
	}, [
		entityPicker,
		sortedEntities,
		value,
		onValueChange,
		drawerTitle,
		searchPlaceholder,
		emptyLabel,
		formatEntity,
		prioritizeEntityIds,
		showCreateOption,
		createOptionLabel,
		onCreateClick,
		actionButtons,
	]);

	const triggerButton = (
		<Button
			variant="outline"
			aria-haspopup="listbox"
			aria-expanded={isMobile && entityPicker ? false : open}
			className={cn(
				"w-full min-h-10 justify-between gap-2 text-sm border-input/50",
				!value && "text-muted-foreground",
				className,
			)}
			disabled={disabled}
			onClick={
				isMobile && entityPicker
					? (e) => {
							e.preventDefault();
							openSharedPicker();
						}
					: undefined
			}
		>
			<div className="flex-1 min-w-0 truncate text-left">
				{selectedEntity ? formatEntity(selectedEntity) : placeholder}
			</div>
			<ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
		</Button>
	);

	// Mobile + shared picker: trigger only (one drawer for the whole page)
	if (isMobile && entityPicker) {
		return triggerButton;
	}

	const commandList = (
		<Command className="w-full flex flex-col min-h-0">
			<CommandInput
				placeholder={searchPlaceholder}
				className="h-10 text-base shrink-0"
				autoFocus
				value={searchValue}
				onValueChange={setSearchValue}
			/>
			<CommandList className="flex-1 overflow-auto max-h-[300px]">
				<CommandEmpty className="p-3 text-sm">{emptyLabel}</CommandEmpty>
				<CommandGroup>
					{showCreateOption && onCreateClick ? (
						<CommandItem
							value={createOptionLabel}
							onSelect={() => {
								onCreateClick();
								handleClose();
							}}
							className="flex items-center gap-2 text-sm h-9"
						>
							<PlusIcon className="h-3.5 w-3.5 shrink-0" />
							<div className="flex-1 min-w-0 wrap-break-word">
								{createOptionLabel}
							</div>
						</CommandItem>
					) : null}
					{sortedEntities.map((entity) => (
						<CommandItem
							key={entity.id}
							value={entity.name}
							onSelect={() => handleSelect(entity.id)}
							className="group flex items-center gap-2 text-sm h-9"
						>
							<CheckIcon
								className={cn(
									"h-3.5 w-3.5 shrink-0",
									value === entity.id ? "opacity-100" : "opacity-0",
								)}
							/>
							<div className="flex-1 min-w-0 wrap-break-word">
								{formatEntity(entity)}
							</div>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
			{showActionButtons && actionButtons.length > 0 ? (
				<div className="border-t p-2 space-y-1 shrink-0">
					{actionButtons.map((action, index) => (
						<Button
							key={`${action.label}-${index}`}
							variant={action.variant || "ghost"}
							size="sm"
							className="w-full justify-start text-xs h-8"
							onClick={() => {
								action.onClick();
								handleClose();
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
		</Command>
	);

	// Mobile fallback without provider:
	// use Popover with MobileEntityList when open (no vaul)
	if (isMobile) {
		return (
			<Popover
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setSearchValue("");
				}}
			>
				<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
				{open ? (
					<PopoverContent
						className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
						align="start"
						side="bottom"
						sideOffset={4}
					>
						<MobileEntityList
							entities={sortedEntities}
							value={value}
							searchValue={searchValue}
							onSearchChange={setSearchValue}
							onSelect={(id) => {
								handleSelect(id);
							}}
							formatEntity={formatEntity}
							emptyLabel={emptyLabel}
							searchPlaceholder={searchPlaceholder}
							showCreateOption={showCreateOption}
							createOptionLabel={createOptionLabel}
							onCreateClick={
								onCreateClick
									? () => {
											onCreateClick();
											handleClose();
										}
									: undefined
							}
							actionButtons={actionButtons}
							showActionButtons={showActionButtons}
						/>
					</PopoverContent>
				) : null}
			</Popover>
		);
	}

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setSearchValue("");
			}}
		>
			<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
			{open ? (
				<PopoverContent className={cn(popoverWidth, "p-0")}>
					<div className="flex flex-col">{commandList}</div>
				</PopoverContent>
			) : null}
		</Popover>
	);
}

export const EntitySelect = memo(EntitySelectInner) as typeof EntitySelectInner;
