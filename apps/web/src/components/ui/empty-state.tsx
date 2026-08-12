import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
	icon?: ReactNode
	title: string
	description?: ReactNode
	className?: string
	/** Compact vertical padding (py-8 instead of py-16) */
	compact?: boolean
	/** Wrap in a bordered card surface (default true) */
	bordered?: boolean
}

function EmptyState({
	icon,
	title,
	description,
	className,
	compact = false,
	bordered = true,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center text-center",
				compact ? "py-8" : "py-16",
				bordered && "rounded-xl border border-border bg-card shadow-soft px-6",
				className,
			)}
		>
			{icon && (
				<div className="mb-4 flex items-center justify-center rounded-full bg-muted p-4">
					{icon}
				</div>
			)}
			<h3 className="mb-2 text-lg font-semibold">{title}</h3>
			{description && (
				<p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
					{description}
				</p>
			)}
		</div>
	)
}

export { EmptyState }
