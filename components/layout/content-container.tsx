import React from "react"
import { cn } from "@/lib/utils"

interface ContentContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
  maxWidth?: "default" | "full" | "narrow"
}

export function ContentContainer({
  children,
  className,
  maxWidth = "default",
  ...props
}: ContentContainerProps) {
  const maxWidthClass = {
    default: "max-w-7xl",
    full: "max-w-full",
    narrow: "max-w-4xl",
  }[maxWidth]

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
        maxWidthClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
