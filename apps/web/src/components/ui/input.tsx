import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary/20 selection:text-primary bg-background border border-input h-10 w-full min-w-0 px-3.5 py-2 text-base rounded-lg outline-none transition-all duration-200 ease-out",
        "hover:border-input/80",
        "focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/10",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
