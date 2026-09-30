import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary/20 selection:text-primary border-input h-10 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
