import { type ComponentProps } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg border transition-all duration-200 ease-out active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent shadow-[0_1px_2px_rgba(124,58,237,0.15),0_2px_4px_rgba(124,58,237,0.1)] hover:shadow-[0_2px_4px_rgba(124,58,237,0.2),0_4px_8px_rgba(124,58,237,0.15)] hover:-translate-y-[1px]",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent shadow-[0_1px_2px_rgba(220,38,38,0.15),0_2px_4px_rgba(220,38,38,0.1)] hover:shadow-[0_2px_4px_rgba(220,38,38,0.2),0_4px_8px_rgba(220,38,38,0.15)] hover:-translate-y-[1px]",
        outline:
          "bg-transparent border-border text-foreground hover:bg-secondary hover:border-secondary-foreground/20 shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80 shadow-[0_1px_2px_rgba(68,55,43,0.05)]",
        ghost:
          "bg-transparent text-foreground hover:bg-secondary/60 border-transparent shadow-none",
        link: "bg-transparent text-primary underline-offset-4 hover:underline border-transparent shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5 rounded-md",
        lg: "h-12 px-6 text-base has-[>svg]:px-4 rounded-xl",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
