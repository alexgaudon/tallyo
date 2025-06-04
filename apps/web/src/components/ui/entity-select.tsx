import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ReactNode } from "react";

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
}: EntitySelectProps<T>) {
	const selectedEntity = value
		? entities.find((entity) => entity.id === value)
		: null;

	return (
		<Select
			value={value ?? ""}
			onValueChange={onValueChange}
			disabled={disabled}
		>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder}>
					{selectedEntity
						? formatEntity(selectedEntity)
						: value === null && allowNull
							? nullLabel
							: placeholder}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{allowNull && <SelectItem value="__null__">{nullLabel}</SelectItem>}
				{entities.length === 0 ? (
					<div className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-muted-foreground">
						{emptyLabel}
					</div>
				) : (
					entities.map((entity) => (
						<SelectItem key={entity.id} value={entity.id}>
							{formatEntity(entity)}
						</SelectItem>
					))
				)}
			</SelectContent>
		</Select>
	);
}
