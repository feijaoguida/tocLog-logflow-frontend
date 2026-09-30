import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary-subtle text-primary [a&]:hover:bg-primary-muted",
        primary:
          "border-primary/20 bg-primary-subtle text-primary [a&]:hover:bg-primary-muted",
        solidPrimary:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-[var(--primary-hover)]",
        secondary:
          "border-border bg-muted text-muted-foreground [a&]:hover:bg-muted/80",
        neutral:
          "border-border bg-muted text-muted-foreground [a&]:hover:bg-muted/80",
        success:
          "border-success/20 bg-success-subtle text-success [a&]:hover:bg-success-subtle/80",
        warning:
          "border-warning/20 bg-warning-subtle text-warning [a&]:hover:bg-warning-subtle/80",
        destructive:
          "border-destructive/20 bg-destructive-subtle text-destructive [a&]:hover:bg-destructive-subtle/80",
        error:
          "border-destructive/20 bg-destructive-subtle text-destructive [a&]:hover:bg-destructive-subtle/80",
        info:
          "border-info/20 bg-info-subtle text-info [a&]:hover:bg-info-subtle/80",
        outline:
          "border-border text-foreground [a&]:hover:bg-muted",
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
}: React.ComponentProps<"span"> &
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
