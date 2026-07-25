import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm outline-none transition-colors placeholder:text-ink-500/50 focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised dark:placeholder:text-white/30",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
