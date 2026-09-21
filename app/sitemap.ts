import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// This is a single-page site — members, events, gallery, and
// achievements are all sections of "/", not separate routes (see
// app/page.tsx) — so there's genuinely only one page worth listing
// here. /login, /dashboard, /admin* and /reset-password are
// account-specific or private and are excluded from both this file
// and search indexing via app/robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
