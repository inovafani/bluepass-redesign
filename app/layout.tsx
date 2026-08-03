import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";

/* The design system specifies GT Walsheim for display type and substitutes
 * Geist (see the DS readme's font caveat); Inter carries all body copy. */
const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bluepass — Book the ocean. Leave it better.",
  description:
    "Vetted operators for surf, sail and dive — at the same price as booking direct. A fixed 5% of every fare protects reefs, funds ocean clean-ups and lifts coastal communities.",
  openGraph: {
    title: "Bluepass — Book the ocean. Leave it better.",
    description:
      "Vetted operators for surf, sail and dive — at the same price as booking direct.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a09",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
