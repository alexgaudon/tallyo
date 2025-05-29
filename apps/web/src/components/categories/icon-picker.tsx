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
import {
	Banknote,
	Bell,
	Bookmark,
	Calendar,
	Car,
	Check,
	ChevronsUpDown,
	CreditCard,
	DollarSign,
	FileText,
	Folder,
	Fuel,
	Heart,
	Home,
	MessageSquare,
	Settings,
	ShoppingCart,
	Star,
	Tag,
	Users,
	Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

// Simple hardcoded list of icons
const availableIcons = [
	{ name: "Home", Icon: Home },
	{ name: "Calendar", Icon: Calendar },
	{ name: "Car", Icon: Car },
	{ name: "Fuel", Icon: Fuel },
	{ name: "Tag", Icon: Tag },
	{ name: "ShoppingCart", Icon: ShoppingCart },
	{ name: "Wallet", Icon: Wallet },
	{ name: "Banknote", Icon: Banknote },
	{ name: "DollarSign", Icon: DollarSign },
	{ name: "CreditCard", Icon: CreditCard },
	{ name: "Users", Icon: Users },
	{ name: "Settings", Icon: Settings },
	{ name: "Star", Icon: Star },
	{ name: "Heart", Icon: Heart },
	{ name: "Bookmark", Icon: Bookmark },
	{ name: "Bell", Icon: Bell },
	{ name: "MessageSquare", Icon: MessageSquare },
	{ name: "FileText", Icon: FileText },
	{ name: "Folder", Icon: Folder },
].sort((a, b) => a.name.localeCompare(b.name));

interface IconPickerProps {
	value?: string;
	onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const selectedIcon = value
		? availableIcons.find((icon) => icon.name === value)
		: null;

	const filteredIcons = useMemo(() => {
		if (!search) return availableIcons;
		return availableIcons.filter((icon) =>
			icon.name.toLowerCase().includes(search.toLowerCase()),
		);
	}, [search]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					aria-expanded={open}
					className="w-full justify-between"
				>
					{selectedIcon ? (
						<div className="flex items-center gap-2">
							<selectedIcon.Icon className="h-4 w-4" />
							<span>{selectedIcon.name}</span>
						</div>
					) : (
						"Select an icon..."
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[300px] p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search icons..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>No icon found.</CommandEmpty>
						<CommandGroup className="max-h-[300px] overflow-auto">
							{filteredIcons.map((icon) => (
								<CommandItem
									key={icon.name}
									onSelect={() => {
										onChange(icon.name);
										setOpen(false);
										setSearch("");
									}}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<icon.Icon className="h-4 w-4" />
										<span>{icon.name}</span>
									</div>
									{value === icon.name && <Check className="ml-2 h-4 w-4" />}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
