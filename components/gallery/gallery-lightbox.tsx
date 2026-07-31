"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { GalleryItem } from "@/lib/types";

interface GalleryLightboxProps {
  items: GalleryItem[];
  active: number;
  onActiveChange: (index: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Fullscreen photo viewer — opened by tapping the main carousel
 * image. Built on the raw Radix Dialog primitive (rather than the
 * styled Dialog in components/ui/dialog.tsx, which is shaped for the
 * site's bottom-sheet/centered-card pattern, not an edge-to-edge
 * photo view) specifically to get its scroll-lock, Escape-to-close,
 * and focus handling for free instead of reimplementing all three.
 */
export function GalleryLightbox({
  items,
  active,
  onActiveChange,
  open,
  onOpenChange,
}: GalleryLightboxProps) {
  const current = items[active];
  if (!current) return null;

  function goPrev() {
    onActiveChange((active - 1 + items.length) % items.length);
  }
  function goNext() {
    onActiveChange((active + 1) % items.length);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-fade-up" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{current.caption}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {current.description ?? `Photo ${active + 1} of ${items.length} in the gallery.`}
          </DialogPrimitive.Description>

          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="relative min-h-0 flex-1">
            {current.image ? (
              <Image
                src={current.image}
                alt={current.caption}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/50">
                No photo for this entry.
              </div>
            )}
          </div>

          {(current.caption || current.description) && (
            <div className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-center">
              <p className="font-display text-base font-medium text-white">{current.caption}</p>
              {current.description && (
                <p className="mx-auto mt-1 max-w-xl text-sm text-white/70">{current.description}</p>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
