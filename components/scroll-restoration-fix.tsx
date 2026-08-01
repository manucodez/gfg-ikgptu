"use client";

import { useEffect } from "react";

export function ScrollRestorationFix() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return null;
}
