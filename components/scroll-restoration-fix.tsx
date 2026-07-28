"use client";

import { useEffect } from "react";

/**
 * Tells the browser not to restore a previous scroll position on
 * reload/back-forward navigation. Without this, reloading the page
 * after having scrolled partway down can jump you back to that same
 * spot — easy to mistake for "the site scrolls somewhere on its own"
 * when really it's the browser's own restoration, not app code.
 * Renders nothing; it's purely a mount-time side effect.
 */
export function ScrollRestorationFix() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return null;
}
