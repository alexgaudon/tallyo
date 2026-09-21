import { type ReactNode, useId } from "react"

import { cn } from "@/lib/utils"

export interface PanelProps {
	/** Eyebrow heading rendered as an accessible heading element. */
	title?: string
	/** Supporting copy shown beneath the title. */
	description?: string
	/** Trailing content aligned with the title (buttons, toggles, menus). */
	actions?: ReactNode
	children: ReactNode
	className?: string
	/** Reduce padding and internal spacing for dense layouts. */
	dense?: boolean
}

/**
 * Surface primitive for grouped content. Replaces the ad-hoc
 * SectionPanel/Card/Section combinations with a single token-driven panel.
 */
export function Panel({
	title,
	description,
	actions,
	children,
	className,
	dense = false,
}: PanelProps) {
	const id = useId()
	const titleId = title ? `${id}-title` : undefined
	const hasHeader = Boolean(title || description || actions)

	return (
		<section
			data-slot="panel"
			aria-labelledby={titleId}
			className={cn(
				"glass-surface text-card-foreground flex flex-col rounded-xl",
				dense ? "gap-2 p-3" : "gap-4 p-5",
				className,
			)}
		>
			{hasHeader && (
				<header className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-1">
						{title && (
							<h2
								id={titleId}
								className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground"
							>
								{title}
							</h2>
						)}
						{description && (
							<p className="text-sm text-muted-foreground leading-relaxed text-balance">
								{description}
							</p>
						)}
					</div>
					{actions && (
						<div className="flex shrink-0 items-center gap-2">{actions}</div>
					)}
				</header>
			)}
			<div className="flex-1 min-h-0">{children}</div>
		</section>
	)
}
