"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [showLeftFade, setShowLeftFade] = React.useState(false);
  const [showRightFade, setShowRightFade] = React.useState(false);

  const updateFades = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    setShowLeftFade(el.scrollLeft > 2);
    setShowRightFade(
      el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    );
  }, []);

  React.useEffect(() => {
    updateFades();

    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateFades, { passive: true });

    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateFades);
      resizeObserver.disconnect();
    };
  }, [updateFades]);

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide px-4"
      >
        <TabsPrimitive.List
          className={cn(
            "inline-flex w-max min-w-max items-center gap-1 rounded-full bg-ink-900/5 p-1 dark:bg-white/10",
            className
          )}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </div>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-paper to-transparent transition-opacity dark:from-surface-dark",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-paper to-transparent transition-opacity dark:from-surface-dark",
          showRightFade ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const el = innerRef.current;

    if (!el) return;

    if (el.dataset.state === "active") {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  });

  return (
    <TabsPrimitive.Trigger
      ref={mergeRefs(innerRef, forwardedRef)}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-ink-500 transition-all data-[state=active]:bg-white data-[state=active]:text-ink-900 data-[state=active]:shadow-soft dark:text-white/50 dark:data-[state=active]:bg-surface-darkRaised dark:data-[state=active]:text-white",
        className
      )}
      {...props}
    />
  );
});

TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = TabsPrimitive.Content;