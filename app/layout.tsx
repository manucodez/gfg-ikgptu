import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollRestorationFix } from "@/components/scroll-restoration-fix";
import { PwaRegister } from "@/components/pwa-register";
import { PwaSplash } from "@/components/pwa-splash";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "./globals.css";

// Falls back to localhost so this never throws in local dev — set the
// real one in production (Vercel project settings, or .env.local for
// a production-like build) so absolute URLs in the OG/Twitter tags
// below and in app/sitemap.ts point at the live site, not localhost.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const title = "GeeksforGeeks Student Chapter — IKGPTU";
const description =
  "The official GeeksforGeeks campus chapter at IKGPTU — DSA practice, workshops, hackathons, and mentorship for every branch and year.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  appleWebApp: {
    title: "GFG IKGPTU",
    statusBarStyle: "default",
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: title,
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "GFG IKGPTU logo" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/icons/icon-512.png"],
  },
};

// Same width/initialScale Next.js already applied by default — repeated
// explicitly here because adding `themeColor` requires a `viewport`
// export, and once present it fully replaces the implicit default.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1F8A4C" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1713" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Detects an installed/standalone PWA launch and marks <html>
            before first paint, so components/pwa-splash.tsx can show
            with zero flash. Runs synchronously (no next/script defer)
            for the same reason next-themes' own script does: it has to
            finish before <body> paints. Regular browser tabs never get
            this class, so the splash stays off for normal visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: fullscreen)").matches||window.navigator.standalone===true;if(s){document.documentElement.classList.add("pwa-standalone");}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ScrollRestorationFix />
        <PwaRegister />
        <PageViewTracker />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PwaSplash />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
