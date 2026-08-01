"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { GalleryCarousel } from "@/components/gallery/gallery-carousel";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryItem } from "@/lib/types";

interface GallerySectionProps {
  galleryItems: GalleryItem[];
}

export function GallerySection({ galleryItems }: GallerySectionProps) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // getGalleryItems() (lib/content-store.ts) returns newest-first —
  // good for the admin panel finding a recent upload to edit, but
  // reversed here so visitors see the chapter's story in chronological
  // order, newest photo last rather than jumping ahead of older ones.
  const orderedItems = [...galleryItems].reverse();
  const activeIndex = Math.min(active, orderedItems.length - 1);

  return (
    <section id="gallery" className="section-pad">
      <div className="container">
        <SectionHeading
          eyebrow="Gallery"
          title="Moments from the chapter."
          description="Workshops, hackathons, speaker sessions, and everything in between."
        />

        <div className="mt-10 space-y-4">
          {orderedItems.length > 0 ? (
            <>
              <GalleryCarousel
                items={orderedItems}
                active={activeIndex}
                onActiveChange={setActive}
                onExpand={() => setLightboxOpen(true)}
              />
              <GalleryGrid items={orderedItems} active={activeIndex} onSelect={setActive} />
              <GalleryLightbox
                items={orderedItems}
                active={activeIndex}
                onActiveChange={setActive}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
              />
            </>
          ) : (
            <p className="text-center text-sm text-ink-500 dark:text-white/50">
              No photos here yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
