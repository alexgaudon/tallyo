import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useRef, useCallback } from "react";
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

export function EntitySelect<T extends Entity>({
	value,
	onValueChange,
	placeholder = "Select an item",
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
}: EntitySelectProps<T>) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const isMobile = useIsMobile();
	const commandListRef = useRef<HTMLDivElement>(null);
	const selectedEntity = value
		? entities.find((entity) => entity.id === value)
		: null;

	const handleSearchChange = useCallback((value: string) => {
		setSearchValue(value);
		// Scroll to top when search changes
		if (commandListRef.current) {
			commandListRef.current.scrollTop = 0;
		}
	}, []);

	const triggerButton = (
		<Button
			variant="outline"
			aria-haspopup="listbox"
			aria-expanded={open}
			className={cn(
				"w-full min-h-10 justify-between gap-2 text-sm border-input/50",
				!value && "text-muted-foreground",
				className,
			)}
			disabled={disabled}
		>
			<div className="flex-1 min-w-0 truncate text-left">
				{selectedEntity ? formatEntity(selectedEntity) : placeholder}
			</div>
			<ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
		</Button>
	);

	const listContent = (
		<>
			<Command
				className={cn(
					"w-full flex flex-col min-h-0",
					isMobile && "bg-transparent rounded-none shadow-none",
				)}
			>
				<CommandInput
					placeholder={searchPlaceholder}
					className={cn("h-10 text-base shrink-0", isMobile && "text-base")}
					autoFocus={!isMobile}
					value={searchValue}
					onValueChange={handleSearchChange}
				/>
				<CommandList
					ref={commandListRef}
					className={cn(
						"flex-1 overflow-auto",
						isMobile ? "max-h-[60vh]" : "max-h-[300px]",
					)}
				>
					<CommandEmpty className="p-3 text-sm">{emptyLabel}</CommandEmpty>
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
								<PlusIcon className="h-3.5 w-3.5 shrink-0" />
								<div className="flex-1 min-w-0 wrap-break-word">
									{createOptionLabel}
								</div>
							</CommandItem>
						)}

						{entities.map((entity) => (
							<CommandItem
								key={entity.id}
								value={entity.name}
								onSelect={() => {
									onValueChange(entity.id);
									setOpen(false);
								}}
								className={cn(
									"group flex items-center gap-2 text-sm",
									isMobile ? "min-h-12 py-3 text-base" : "h-9",
								)}
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
			<Drawer
				open={open}
				onOpenChange={(newOpen) => {
					setOpen(newOpen);
					if (!newOpen) {
						// Reset search when closing
						setSearchValue("");
					}
				}}
				direction="bottom"
				modal={false}
				shouldScaleBackground={false}
			>
				<DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
				<DrawerContent
					className={cn(
						"flex flex-col rounded-t-xl border-t border-border w-full inset-x-0 animate-none max-h-[80dvh]",
						"bg-popover text-popover-foreground",
					)}
					style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
				>
					<div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-0">
						{listContent}
					</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Popover 
			open={open} 
			onOpenChange={(newOpen) => {
				setOpen(newOpen);
				if (!newOpen) {
					// Reset search when closing
					setSearchValue("");
				}
			}}
		>
			<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
			<PopoverContent 
				className={cn(popoverWidth, "p-0")}
				onInteractOutside={(e) => {
					// Don't close when clicking the trigger button itself
					const target = e.target as HTMLElement;
					if (target.closest('[data-slot="popover-trigger"]')) {
						e.preventDefault();
					}
				}}
			>
				<div className="flex flex-col">{listContent}</div>
			</PopoverContent>
		</Popover>
	);
}
