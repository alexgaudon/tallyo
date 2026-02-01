import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
	const selectedEntity = value
		? entities.find((entity) => entity.id === value)
		: null;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					aria-haspopup="listbox"
					aria-expanded={open}
					className={cn(
						"w-full h-9 justify-between gap-2 text-sm border-input/50",
						!value && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
				>
					<div className="flex-1 min-w-0 truncate">
						{selectedEntity ? formatEntity(selectedEntity) : placeholder}
					</div>
					<ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn(popoverWidth, "p-0")}>
				<div className="flex flex-col">
					{/* Top portion: Filterable combobox */}
					<Command className="w-full">
						<CommandInput
							placeholder={searchPlaceholder}
							className="h-9 text-sm"
						/>
						<CommandList>
							<CommandEmpty className="p-2 text-sm">{emptyLabel}</CommandEmpty>
							<CommandGroup>
								{showCreateOption && onCreateClick && (
									<CommandItem
										value={createOptionLabel}
										onSelect={() => {
											onCreateClick();
											setOpen(false);
										}}
										className="flex items-center gap-2 h-9 text-sm text-blue-600 hover:text-blue-700"
									>
										<PlusIcon className="h-3.5 w-3.5 shrink-0" />
										<div className="flex-1 min-w-0 break-words">
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
										className="flex items-center gap-2 h-9 text-sm"
									>
										<CheckIcon
											className={cn(
												"h-3.5 w-3.5 shrink-0",
												value === entity.id ? "opacity-100" : "opacity-0",
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

					{/* Bottom portion: Action buttons */}
					{showActionButtons && actionButtons.length > 0 && (
						<div className="border-t p-2 space-y-1">
							{actionButtons.map((action, index) => (
								<Button
									key={`${action.label}-${index}`}
									variant={action.variant || "ghost"}
									size="sm"
									className="w-full justify-start h-8 text-xs"
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
				</div>
			</PopoverContent>
		</Popover>
	);
}
