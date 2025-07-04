import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useCallback, useState } from "react";

interface KeywordPillsProps {
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
}

export function KeywordPills({
	value,
	onChange,
	placeholder = "Add keywords...",
	className,
}: KeywordPillsProps) {
	const [inputValue, setInputValue] = useState("");

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && inputValue.trim()) {
				e.preventDefault();
				const newKeyword = inputValue.trim();
				if (!value.includes(newKeyword)) {
					onChange([...value, newKeyword]);
				}
				setInputValue("");
			} else if (e.key === "Backspace" && !inputValue && value.length > 0) {
				onChange(value.slice(0, -1));
			}
		},
		[inputValue, value, onChange],
	);

	const removeKeyword = useCallback(
		(keywordToRemove: string) => {
			onChange(value.filter((keyword) => keyword !== keywordToRemove));
		},
		[value, onChange],
	);

	const displayKeywords = value.slice(-15);
	const remainingCount = value.length - 15;

	return (
		<div
			className={cn("flex flex-wrap gap-2 rounded-md border p-2", className)}
		>
			{displayKeywords.map((keyword) => (
				<span
					key={keyword}
					className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
				>
					{keyword}
					<button
						type="button"
						onClick={() => removeKeyword(keyword)}
						className="ml-1 rounded-full hover:bg-muted-foreground/20"
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}
			{remainingCount > 0 && (
				<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					and {remainingCount} more items
				</span>
			)}
			<Input
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={value.length === 0 ? placeholder : ""}
				className="h-6 min-w-[120px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
			/>
		</div>
	);
}
