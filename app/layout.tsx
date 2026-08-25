import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollRestorationFix } from "@/components/scroll-restoration-fix";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeeksforGeeks Student Chapter — IKGPTU",
  description:
    "The official GeeksforGeeks campus chapter at IKGPTU — DSA practice, workshops, hackathons, and mentorship for every branch and year.",
  appleWebApp: {
    title: "GFG IKGPTU",
    statusBarStyle: "default",
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
      </head>
      <body>
        <ScrollRestorationFix />
        <PwaRegister />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
