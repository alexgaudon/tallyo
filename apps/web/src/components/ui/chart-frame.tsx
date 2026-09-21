import { type ReactNode, useId } from "react"

import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface ChartFrameProps {
	/** Chart heading rendered as a heading element. */
	title?: string
	/** Supporting copy shown beneath the title. */
	description?: string
	/** Trailing content aligned with the title (toggles, menus, controls). */
	actions?: ReactNode
	/** Legend rendered between the header and the chart body. */
	legend?: ReactNode
	/** Show a loading placeholder instead of the chart body. */
	isLoading?: boolean
	/** Show the empty state instead of the chart body (ignored while loading). */
	isEmpty?: boolean
	/** Empty-state heading. Defaults to "No data". */
	emptyTitle?: string
	/** Empty-state supporting copy. */
	emptyDescription?: ReactNode
	children?: ReactNode
	className?: string
}

/**
 * Shared chrome for charts: title, legend, actions, tooltip provider, and
 * loading/empty states. Layout-agnostic, so it can sit inside a Panel or
 * stand alone without additional card styling.
 */
export function ChartFrame({
	title,
	description,
	actions,
	legend,
	isLoading = false,
	isEmpty = false,
	emptyTitle,
	emptyDescription,
	children,
	className,
}: ChartFrameProps) {
	const id = useId()
	const titleId = title ? `${id}-title` : undefined
	const hasHeader = Boolean(title || description || actions)
	const showEmpty = !isLoading && isEmpty

	return (
		<TooltipProvider>
			<div
				data-slot="chart-frame"
				className={cn("flex flex-col gap-3", className)}
			>
				{hasHeader && (
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 space-y-1">
							{title && (
								<h3
									id={titleId}
									className="text-sm font-semibold tracking-tight text-foreground"
								>
									{title}
								</h3>
							)}
							{description && (
								<p className="text-xs text-muted-foreground leading-relaxed">
									{description}
								</p>
							)}
						</div>
						{actions && (
							<div className="flex shrink-0 items-center gap-2">{actions}</div>
						)}
					</div>
				)}

				{legend && (
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
						{legend}
					</div>
				)}

				{isLoading ? (
					<div
						className="flex min-h-[180px] flex-col justify-center gap-2"
						aria-busy="true"
						aria-live="polite"
					>
						<Skeleton className="h-3 w-1/3 bg-muted" />
						<Skeleton className="h-24 w-full bg-muted" />
						<Skeleton className="h-3 w-2/3 bg-muted" />
					</div>
				) : showEmpty ? (
					<EmptyState
						compact
						bordered={false}
						title={emptyTitle ?? "No data"}
						description={emptyDescription}
						className="min-h-[180px]"
					/>
				) : (
					<div
						aria-labelledby={titleId}
						className="min-w-0 flex-1 text-muted-foreground [&_svg]:max-w-full"
					>
						{children}
					</div>
				)}
			</div>
		</TooltipProvider>
	)
}
