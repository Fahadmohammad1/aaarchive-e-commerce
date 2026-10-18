import type { Metadata, Viewport } from "next";
import {
  Alfa_Slab_One,
  Hind_Siliguri,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

// Self-hosted by next/font. The variables feed the font stacks in globals.css.
const alfaSlab = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-alfa-slab",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const hind = Hind_Siliguri({
  weight: ["400", "600"],
  subsets: ["bengali", "latin"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute URLs for canonical links and Open Graph images.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: { siteName: "Aaarchive", locale: "en_BD", type: "website" },
  title: {
    default: "Aaarchive — Hoodies, Panjabi & Streetwear",
    template: "%s — Aaarchive",
  },
  description:
    "Aaarchive is a Bangladeshi clothing label: hoodies, panjabi and everyday pieces worth keeping. Cash on delivery all over Bangladesh.",
};

export const viewport: Viewport = {
  themeColor: "#120607",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${alfaSlab.variable} ${jetbrains.variable} ${inter.variable} ${hind.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
