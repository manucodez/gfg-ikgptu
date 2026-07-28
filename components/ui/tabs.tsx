"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** Merges a locally-owned ref with a forwarded one — needed because
 *  this component both forwards its ref (for API compatibility) and
 *  needs its own access to the DOM node (to scroll it into view). */
function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = React.useState(false);
  const [showRightFade, setShowRightFade] = React.useState(false);

  // Keeps the left/right "there's more this way" fades in sync with
  // actual scroll position — e.g. the right fade disappears once
  // you've scrolled all the way to the last tab, rather than always
  // showing regardless of whether there's really more content.
  const updateFades = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateFades, { passive: true });
    const observer = new ResizeObserver(updateFades);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFades);
      observer.disconnect();
    };
  }, [updateFades]);

  return (
    <div className="relative max-w-full">
      <TabsPrimitive.List
        ref={scrollRef}
        className={cn(
          "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-ink-900/5 p-1 scrollbar-hide dark:bg-white/10",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
      {/* Edge fades hint that the strip scrolls — without these, a
          tab strip wider than the screen (common once there are more
          than 4-5 tabs on mobile) just looks cut off rather than
          "scroll for more". Colors match the page background on each
          side of the pill so the fade blends in either theme. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-paper to-transparent transition-opacity dark:from-surface-dark",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent transition-opacity dark:from-surface-dark",
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

  // Whenever this tab becomes the active one — including on the very
  // first render, if it's the default tab — scroll it fully into view
  // within the tab strip. Without this, tapping a tab near the edge
  // of a scrolled-but-not-all-the-way-scrolled strip can leave it
  // sitting half cut off, which reads as broken rather than "just
  // scroll a bit more".
  React.useEffect(() => {
    if (innerRef.current?.getAttribute("data-state") === "active") {
      innerRef.current.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    }
  });

  return (
    <TabsPrimitive.Trigger
      ref={mergeRefs(innerRef, forwardedRef)}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-ink-500 transition-colors data-[state=active]:bg-white data-[state=active]:text-ink-900 data-[state=active]:shadow-soft dark:text-white/50 dark:data-[state=active]:bg-surface-darkRaised dark:data-[state=active]:text-white",
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = TabsPrimitive.Content;
