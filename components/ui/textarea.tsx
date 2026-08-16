import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        // text-base (16px) below sm: to stop iOS Safari's auto-zoom
        // on focus — see the same comment in ui/input.tsx.
        "w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-ink-500/50 focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised dark:placeholder:text-white/30 sm:text-sm",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
