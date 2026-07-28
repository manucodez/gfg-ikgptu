import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollRestorationFix } from "@/components/scroll-restoration-fix";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeeksforGeeks Student Chapter — IKGPTU",
  description:
    "The official GeeksforGeeks campus chapter at IKGPTU — DSA practice, workshops, hackathons, and mentorship for every branch and year.",
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
