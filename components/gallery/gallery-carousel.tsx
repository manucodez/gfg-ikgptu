"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { GalleryItem } from "@/lib/types";

interface GalleryCarouselProps {
  items: GalleryItem[];
  active: number;
  onActiveChange: (index: number) => void;
}

export function GalleryCarousel({ items, active, onActiveChange }: GalleryCarouselProps) {
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
    <div
      className="relative overflow-hidden rounded-3xl bg-ink-900 shadow-raised"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
              <>
                <Image
                  src={current.image}
                  alt={current.caption}
                  fill
                  sizes="(min-width: 1024px) 800px, 100vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                  <p className="font-display text-lg font-medium text-white">{current.caption}</p>
                  {current.description && (
                    <p className="mt-1 max-w-xl text-sm text-white/80">{current.description}</p>
                  )}
                  <p className="mt-1 font-mono text-xs uppercase tracking-wide text-white/70">
                    {current.category}
                  </p>
                </div>
              </>
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
  );
}
