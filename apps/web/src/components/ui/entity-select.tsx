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
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

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

interface EntitySelectProps<T extends Entity> {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	placeholder?: string;
	className?: string;
	allowNull?: boolean;
	entities: T[];
	formatEntity?: (entity: T) => ReactNode;
	nullLabel?: string;
	emptyLabel?: string;
	disabled?: boolean;
	searchPlaceholder?: string;
	// New props for create option
	showCreateOption?: boolean;
	createOptionLabel?: string;
	onCreateClick?: () => void;
}

export function EntitySelect<T extends Entity>({
	value,
	onValueChange,
	placeholder = "Select an item",
	className,
	allowNull = false,
	entities,
	formatEntity = (entity) => entity.name,
	nullLabel = "No item",
	emptyLabel = "No items available",
	disabled = false,
	searchPlaceholder = "Search...",
	// New props for create option
	showCreateOption = false,
	createOptionLabel = "Create new...",
	onCreateClick,
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
						"w-full max-w-[200px] h-9 justify-between gap-2 text-sm",
						!value && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
				>
					<div className="flex-1 min-w-0">
						{value === "__null__" && allowNull
							? nullLabel
							: selectedEntity
								? formatEntity(selectedEntity)
								: placeholder}
					</div>
					<ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command className="w-full">
					<CommandInput
						placeholder={searchPlaceholder}
						className="h-9 text-sm"
					/>
					<CommandList>
						<CommandEmpty className="py-2 text-sm">{emptyLabel}</CommandEmpty>
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
									<div className="flex-1 min-w-0">{createOptionLabel}</div>
								</CommandItem>
							)}
							{allowNull && (
								<CommandItem
									value={nullLabel}
									onSelect={() => {
										onValueChange("__null__");
										setOpen(false);
									}}
									className="flex items-center gap-2 h-9 text-sm"
								>
									<CheckIcon
										className={cn(
											"h-3.5 w-3.5 shrink-0",
											value === null ? "opacity-100" : "opacity-0",
										)}
									/>
									<div className="flex-1 min-w-0">{nullLabel}</div>
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
									<div className="flex-1 min-w-0">{formatEntity(entity)}</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
