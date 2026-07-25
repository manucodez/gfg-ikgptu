import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "neutral" | "live" | "past";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
  neutral: "bg-ink-900/5 text-ink-700 dark:bg-white/10 dark:text-white/70",
  live: "bg-brand-600 text-white",
  past: "bg-ink-900/10 text-ink-500 dark:bg-white/10 dark:text-white/50",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
