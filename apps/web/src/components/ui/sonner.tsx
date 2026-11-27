import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner } from "sonner"
import type { ComponentProps, CSSProperties } from "react"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      className="toaster group"
      // Top-positioned toasts must clear the fixed top chrome (the mobile
      // app header below lg, TopNav on unauthenticated pages). iOS WebKit
      // paints a backdrop-filter surface above the toaster regardless of
      // z-index, so an overlapping toast renders blurred behind the glass
      // and loses its taps. --toast-top-clearance is breakpoint-aware and
      // defined in index.css.
      offset={{ top: "var(--toast-top-clearance, 1.5rem)" }}
      mobileOffset={{ top: "var(--toast-top-clearance, 1.5rem)" }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
