import type { MetadataRoute } from "next";

// Next.js auto-detects this file and serves it at /manifest.webmanifest,
// injecting the <link rel="manifest"> tag into every page's <head> for us —
// nothing else needs to change in layout.tsx for this part.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GeeksforGeeks Student Chapter — IKGPTU",
    short_name: "GFG IKGPTU",
    description:
      "The official GeeksforGeeks campus chapter at IKGPTU — DSA practice, workshops, hackathons, and mentorship for every branch and year.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F7F9F7",
    theme_color: "#1F8A4C",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
