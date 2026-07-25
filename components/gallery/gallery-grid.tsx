"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GalleryItem } from "@/lib/types";

interface GalleryGridProps {
  items: GalleryItem[];
  active: number;
  onSelect: (index: number) => void;
}

export function GalleryGrid({ items, active, onSelect }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-ink-900/[0.04] p-2 text-center transition-all dark:bg-white/5",
            i === active && "ring-2 ring-brand-500"
          )}
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={item.caption}
              fill
              sizes="120px"
              className="object-cover"
            />
          ) : (
            <>
              <ImageIcon className="h-4 w-4 text-ink-500 dark:text-white/40" />
              <span className="hidden truncate text-[9px] text-ink-500 dark:text-white/40 sm:block">
                {item.caption}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
