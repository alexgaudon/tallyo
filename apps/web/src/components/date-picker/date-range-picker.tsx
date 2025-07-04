import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
	addDays,
	endOfMonth,
	endOfYear,
	format,
	startOfMonth,
	startOfYear,
	subMonths,
	subYears,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

const presets = [
	{
		label: "Last 7 days",
		value: () => ({
			from: addDays(new Date(), -7),
			to: new Date(),
		}),
	},
	{
		label: "Last 14 days",
		value: () => ({
			from: addDays(new Date(), -14),
			to: new Date(),
		}),
	},
	{
		label: "Last 30 days",
		value: () => ({
			from: addDays(new Date(), -30),
			to: new Date(),
		}),
	},
	{
		label: "This month",
		value: () => ({
			from: startOfMonth(new Date()),
			to: endOfMonth(new Date()),
		}),
	},
	{
		label: "Last month",
		value: () => ({
			from: startOfMonth(subMonths(new Date(), 1)),
			to: endOfMonth(subMonths(new Date(), 1)),
		}),
	},
	{
		label: "This year",
		value: () => ({
			from: startOfYear(new Date()),
			to: endOfYear(new Date()),
		}),
	},
	{
		label: "Last year",
		value: () => ({
			from: startOfYear(subYears(new Date(), 1)),
			to: endOfYear(subYears(new Date(), 1)),
		}),
	},
];

export default function DateRangePicker({
	className,
	onRangeChange,
}: {
	className?: string;
	onRangeChange?: (date: DateRange | undefined) => void;
}) {
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date()),
	});

	React.useEffect(() => {
		onRangeChange?.(date);
	}, [date, onRangeChange]);

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant="outline"
						className={cn(
							"w-full sm:w-[300px] justify-start text-left font-normal",
							!date && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, "LLL dd, y")} -{" "}
									{format(date.to, "LLL dd, y")}
								</>
							) : (
								format(date.from, "LLL dd, y")
							)
						) : (
							<span>Pick a date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="flex">
						<Calendar
							autoFocus
							mode="range"
							defaultMonth={date?.from}
							selected={date}
							onSelect={setDate}
							numberOfMonths={1}
						/>
						<div className="p-3 border-b">
							<div className="grid grid-cols-1 gap-2">
								{presets.map((preset) => (
									<Button
										key={preset.label}
										variant="outline"
										size="sm"
										className="text-xs"
										onClick={() => setDate(preset.value())}
									>
										{preset.label}
									</Button>
								))}
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
