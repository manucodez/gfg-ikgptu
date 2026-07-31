"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2 } from "lucide-react";
import { GalleryItem } from "@/lib/types";

interface GalleryCarouselProps {
  items: GalleryItem[];
  active: number;
  onActiveChange: (index: number) => void;
  onExpand: () => void;
}

export function GalleryCarousel({ items, active, onActiveChange, onExpand }: GalleryCarouselProps) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      onActiveChange((active + 1) % items.length);
    }, 4500);
    return () => clearInterval(id);
  }, [active, items.length, onActiveChange, paused]);

  const current = items[active];

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-3xl bg-ink-900 shadow-raised"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* A fixed ratio here keeps the surrounding page layout stable
            across devices; object-contain on the actual photo below
            (rather than object-cover) means it never gets cropped
            regardless of whether the source photo is landscape,
            portrait, or square — the blurred copy of the same image
            fills whatever letterboxed space is left, so there's never
            an empty/awkward gap either. */}
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {current.image ? (
                <button
                  type="button"
                  onClick={onExpand}
                  aria-label={`View "${current.caption}" fullscreen`}
                  className="group relative block h-full w-full cursor-zoom-in"
                >
                  <Image
                    src={current.image}
                    alt=""
                    aria-hidden
                    fill
                    sizes="100vw"
                    className="scale-110 object-cover opacity-50 blur-2xl"
                  />
                  <Image
                    src={current.image}
                    alt={current.caption}
                    fill
                    sizes="(min-width: 1024px) 800px, 100vw"
                    className="object-contain"
                    priority
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                      <Maximize2 className="h-5 w-5" />
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-900 via-ink-900 to-brand-950 text-white">
                  <ImageIcon className="h-9 w-9 text-white/40" />
                  <p className="font-display text-lg font-medium">{current.caption}</p>
                  <p className="font-mono text-xs uppercase tracking-wide text-white/50">
                    {current.category}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => onActiveChange((active - 1 + items.length) % items.length)}
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => onActiveChange((active + 1) % items.length)}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => onActiveChange(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Caption/description live below the photo itself, not
          overlaid on top of it — keeps the image fully visible and
          the text easy to read regardless of how busy the photo is. */}
      <div className="mt-3 px-1 text-center sm:text-left">
        <p className="font-display text-lg font-medium text-ink-900 dark:text-white">
          {current.caption}
        </p>
        {current.description && (
          <p className="mt-1 text-sm text-ink-500 dark:text-white/60">{current.description}</p>
        )}
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-500/70 dark:text-white/40">
          {current.category}
        </p>
      </div>
    </div>
  );
}
