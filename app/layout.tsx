import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import { themeInitScript } from "@/lib/theme";

/**
 * Inter is the app-wide typeface, matching
 * `reference/Reachly Dashboard (1).html`. It is loaded once here and exposed as
 * a CSS variable, so no route loads its own copy.
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadPilot",
  description: "Project setup in progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below writes `data-theme` on <html> before React
      // hydrates, so the client DOM intentionally differs from the server
      // markup. React keeps the DOM value instead of reporting a mismatch.
      suppressHydrationWarning
    >
      <head>
        {/*
          Runs synchronously while the browser parses the document, so the
          saved theme is applied before the first paint and the app never
          flashes the wrong palette. It lives in <head> (the document shell)
          rather than a component body, so React never re-renders it and never
          warns about a script tag inside a component.
        */}
        <script
          id="reachly-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
