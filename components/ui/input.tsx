import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // text-base (16px) below the sm: breakpoint, not text-sm —
        // iOS Safari auto-zooms the whole page on focus for any input
        // with a font-size under 16px, which on a phone is jarring
        // and leaves the page zoomed in after the field blurs.
        "h-11 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-base outline-none transition-colors placeholder:text-ink-500/50 focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised dark:placeholder:text-white/30 sm:text-sm",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
