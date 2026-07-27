import Image from "next/image";
import { cn, getAvatarTone, getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  avatar?: string;
  size?: number;
  /** If set, the avatar scales down to this minimum on narrow
   *  viewports instead of staying fixed at `size` — used in the
   *  member grid so tiles feel properly proportioned on a phone
   *  screen instead of a fixed desktop-sized circle. */
  minSize?: number;
  className?: string;
}

/** Circular avatar tile: real photo if provided, otherwise a
 *  deterministic-color initials tile so the grid never shows
 *  broken images while photos are being collected. */
export function Avatar({ name, avatar, size = 88, minSize, className }: AvatarProps) {
  const dimension = minSize ? `clamp(${minSize}px, 20vw, ${size}px)` : `${size}px`;
  const initialsFontSize = minSize
    ? `clamp(${minSize * 0.32}px, 6.4vw, ${size * 0.32}px)`
    : size * 0.32;

  if (avatar) {
    // blob:/data: URLs (used for an in-progress upload preview before
    // it's saved) can't go through next/image's server-side optimizer
    // — it has nothing to fetch. Render those unoptimized.
    const isLocalPreview = avatar.startsWith("blob:") || avatar.startsWith("data:");
    return (
      <div
        className={cn("relative overflow-hidden rounded-full", className)}
        style={{ width: dimension, height: dimension }}
      >
        <Image
          src={avatar}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={isLocalPreview}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-display font-medium text-white",
        getAvatarTone(name),
        className
      )}
      style={{ width: dimension, height: dimension, fontSize: initialsFontSize }}
    >
      {getInitials(name)}
    </div>
  );
}
