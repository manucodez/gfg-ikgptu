"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-ink-900/5 p-1 scrollbar-hide dark:bg-white/10",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-ink-500 transition-colors data-[state=active]:bg-white data-[state=active]:text-ink-900 data-[state=active]:shadow-soft dark:text-white/50 dark:data-[state=active]:bg-surface-darkRaised dark:data-[state=active]:text-white",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
