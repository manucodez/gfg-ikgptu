"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

/**
 * The boot screen shown for a beat when the site is launched as an
 * installed PWA (from a home-screen icon), right after the OS's own
 * native splash hands off to the real page.
 *
 * That native splash — the one Android/Chrome auto-generates from
 * manifest.ts (icon + background_color) — has a layout the OS controls;
 * we can't restyle it into a full custom design. This component is the
 * part we *can* fully design: the app's own first paint, using the full
 * lockup logo and the site's real light/dark tokens.
 *
 * It's invisible by default (see the `.pwa-splash` rule in globals.css)
 * and only switched on by the blocking script in layout.tsx's <head>,
 * which detects standalone/installed mode before first paint. Regular
 * website visits — anyone opening this in a normal browser tab — never
 * see it, so nothing changes for them.
 */
export function PwaSplash() {
  const [hiding, setHiding] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const MIN_VISIBLE_MS = 400;
    const FADE_MS = 300;
    const start = Date.now();

    const dismiss = () => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      window.setTimeout(() => {
        setHiding(true);
        window.setTimeout(() => setMounted(false), FADE_MS);
      }, wait);
    };

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
      return () => window.removeEventListener("load", dismiss);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`pwa-splash bg-paper dark:bg-surface-dark transition-opacity duration-300 ${
        hiding ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <Logo className="w-52 sm:w-60" />
    </div>
  );
}
