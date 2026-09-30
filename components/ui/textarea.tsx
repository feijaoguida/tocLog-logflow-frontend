import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground selection:bg-primary/20 selection:text-primary flex min-h-24 w-full rounded-md border bg-background px-3 py-2.5 text-sm shadow-xs transition-colors outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
