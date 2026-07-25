import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-500/50 focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised dark:placeholder:text-white/30",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
