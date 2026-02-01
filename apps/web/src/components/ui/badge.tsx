import { type ComponentProps } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border-2 px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 aria-invalid:border-destructive transition-none overflow-hidden font-mono uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground [a&]:hover:bg-transparent [a&]:hover:text-primary",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground [a&]:hover:bg-transparent [a&]:hover:text-secondary-foreground",
        destructive:
          "border-destructive bg-destructive text-primary-foreground [a&]:hover:bg-transparent [a&]:hover:text-destructive",
        outline:
          "text-foreground [a&]:hover:bg-foreground [a&]:hover:text-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
