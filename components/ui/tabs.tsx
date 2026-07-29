"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

// Wraps onto multiple rows instead of scrolling horizontally.
// Deliberately simple: a scrollable single-row strip needs some way
// to signal "there's more, scroll for it" (an auto-scroll-to-active
// effect, a fade edge, a visible scrollbar...), and every version of
// that turned out fragile in practice — a tab could still land
// partially cut off with no clear affordance that more existed.
// Wrapping sidesteps the whole problem: every tab is always fully on
// screen, nothing to discover. Costs a bit of vertical space once
// there are enough tabs to need a second row (only happens in the
// admin dashboard, which has 8 — the public site's 4-tab event filter
// still renders as one row exactly as before, since 4 short words
// always fit without wrapping).
export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-2xl bg-ink-900/5 p-1.5 dark:bg-white/10",
        className
      )}
      {...props}
    />
  );
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "rounded-full px-4 py-1.5 text-sm font-medium text-ink-500 transition-colors data-[state=active]:bg-white data-[state=active]:text-ink-900 data-[state=active]:shadow-soft dark:text-white/50 dark:data-[state=active]:bg-surface-darkRaised dark:data-[state=active]:text-white",
      className
    )}
    {...props}
  />
));

TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = TabsPrimitive.Content;
