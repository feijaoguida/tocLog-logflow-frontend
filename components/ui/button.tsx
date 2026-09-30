import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] shadow-xs",
        secondary:
          "bg-muted text-foreground hover:bg-muted/80 border border-border shadow-xs",
        outline:
          "border border-border bg-background hover:bg-surface-muted text-foreground shadow-xs",
        outlinePrimary:
          "border border-primary text-primary bg-transparent hover:bg-primary-subtle shadow-xs",
        ghost:
          "hover:bg-muted text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
        glass: 
          "bg-card/80 border border-border text-foreground hover:bg-muted shadow-xs",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-md text-xs gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-md px-6 text-base has-[>svg]:px-4",
        icon: "size-10 rounded-md",
        "icon-sm": "size-9 rounded-md",
        "icon-lg": "size-11 rounded-md",
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
}: React.ComponentProps<"button"> &
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
