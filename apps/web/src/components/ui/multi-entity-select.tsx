import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Drawer,
	DrawerContent,
	DrawerTrigger,
} from "@/components/ui/drawer";
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

interface MultiEntitySelectProps<T extends Entity> {
	value?: string[];
	onValueChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
	entities: T[];
	formatEntity?: (entity: T) => ReactNode;
	emptyLabel?: string;
	disabled?: boolean;
	searchPlaceholder?: string;
	// New props for create option
	showCreateOption?: boolean;
	createOptionLabel?: string;
	onCreateClick?: () => void;
	// New props for action buttons
	actionButtons?: ActionButton[];
	showActionButtons?: boolean;
	// Popover width customization
	popoverWidth?: string;
}

export function MultiEntitySelect<T extends Entity>({
	value = [],
	onValueChange,
	placeholder = "Select items",
	className,
	entities,
	formatEntity = (entity) => entity.name,
	emptyLabel = "No items available",
	disabled = false,
	searchPlaceholder = "Search...",
	// New props for create option
	showCreateOption = false,
	createOptionLabel = "Create new...",
	onCreateClick,
	// New props for action buttons
	actionButtons = [],
	showActionButtons = false,
	// New props for popover width
	popoverWidth = "w-[400px]",
}: MultiEntitySelectProps<T>) {
	const [open, setOpen] = useState(false);
	const isMobile = useIsMobile();
	const selectedEntities = entities.filter((entity) =>
		value.includes(entity.id),
	);

	const handleSelect = (entityId: string) => {
		const newValue = value.includes(entityId)
			? value.filter((id) => id !== entityId)
			: [...value, entityId];
		onValueChange(newValue);
	};

	const handleRemove = (entityId: string) => {
		onValueChange(value.filter((id) => id !== entityId));
	};

	const displayText =
		selectedEntities.length > 0
			? selectedEntities.length === 1
				? formatEntity(selectedEntities[0])
				: `${selectedEntities.length} items selected`
			: placeholder;

	const triggerButton = (
		<Button
			variant="outline"
			aria-haspopup="listbox"
			aria-expanded={open}
			className={cn(
				"w-full min-h-10 justify-between gap-2 text-sm",
				!value.length && "text-muted-foreground",
				className,
			)}
			disabled={disabled}
		>
			<div className="flex-1 min-w-0 flex flex-wrap gap-1">
				{selectedEntities.length > 0 ? (
					selectedEntities.length <= 2 ? (
						selectedEntities.map((entity) => (
							<Badge
								key={entity.id}
								variant="secondary"
								className="text-xs"
							>
								{formatEntity(entity)}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleRemove(entity.id);
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
									onClick={(e) => {
										e.stopPropagation();
										handleRemove(selectedEntities[0].id);
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
					)
				) : (
					<span className="truncate">{displayText}</span>
				)}
			</div>
			<ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
		</Button>
	);

	const listContent = (
		<>
			<Command className="w-full flex flex-col min-h-0">
				<CommandInput
					placeholder={searchPlaceholder}
					className={cn("h-10 shrink-0", isMobile && "text-base")}
					autoFocus={!isMobile}
				/>
				<CommandList
					className={cn(
						"flex-1 overflow-auto",
						isMobile ? "max-h-[60vh]" : "max-h-[300px]",
					)}
				>
					<CommandEmpty className="py-3 text-sm">{emptyLabel}</CommandEmpty>
					<CommandGroup>
						{showCreateOption && onCreateClick && (
							<CommandItem
								value={createOptionLabel}
								onSelect={() => {
									onCreateClick();
									setOpen(false);
								}}
								className={cn(
									"flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700",
									isMobile ? "min-h-12 py-3 text-base" : "h-9",
								)}
							>
								<div className="flex-1 min-w-0 break-words">
									{createOptionLabel}
								</div>
							</CommandItem>
						)}

						{entities.map((entity) => (
							<CommandItem
								key={entity.id}
								value={entity.name}
								onSelect={() => handleSelect(entity.id)}
								className={cn(
									"flex items-center gap-2 text-sm",
									isMobile ? "min-h-12 py-3 text-base" : "h-9",
								)}
							>
								<CheckIcon
									className={cn(
										"h-3.5 w-3.5 shrink-0",
										value.includes(entity.id) ? "opacity-100" : "opacity-0",
									)}
								/>
								<div className="flex-1 min-w-0 break-words">
									{formatEntity(entity)}
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</Command>

			{showActionButtons && actionButtons.length > 0 && (
				<div className="border-t p-2 space-y-1 shrink-0">
					{actionButtons.map((action, index) => (
						<Button
							key={`${action.label}-${index}`}
							variant={action.variant || "ghost"}
							size="sm"
							className={cn(
								"w-full justify-start text-xs",
								isMobile ? "min-h-11 py-3" : "h-8",
							)}
							onClick={() => {
								action.onClick();
								setOpen(false);
							}}
							disabled={action.disabled}
						>
							{action.icon && (
								<span className="mr-2 h-3 w-3">{action.icon}</span>
							)}
							{action.label}
						</Button>
					))}
				</div>
			)}
		</>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen} direction="bottom">
				<DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
				<DrawerContent
					className={cn(
						"max-h-[85vh] flex flex-col rounded-t-xl border-t",
						popoverWidth,
					)}
				>
					<div className="flex flex-col flex-1 min-h-0 overflow-hidden p-0">
						{listContent}
					</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
			<PopoverContent className={cn(popoverWidth, "p-0")}>
				<div className="flex flex-col">{listContent}</div>
			</PopoverContent>
		</Popover>
	);
}
