"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js).
 *
 * Only runs in production: registering a service worker in `next dev`
 * is a classic source of "why is my change not showing up" confusion,
 * since the SW can serve cached responses over the dev server's live
 * output. Keeping it production-only means local development behaves
 * exactly as it did before this file existed.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a progressive enhancement — if registration
        // fails for any reason, the site should keep working normally.
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
