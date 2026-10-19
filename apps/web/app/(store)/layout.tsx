import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getStoreSettings } from "@/lib/content/content-store-api";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import {
  AnnouncementSlot,
  BundledHeaderLogo,
  FloatingContactSlot,
  FooterSlot,
  HeaderLogoSlot,
} from "./_components/site-slots";

/**
 * Default title, description and share image from Settings → SEO (PRD §6.8).
 * Request-time (connection) so the build never needs the API; the store
 * pages all have dynamic slots, which Cache Components requires for this.
 */
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  try {
    const { seo, store } = await getStoreSettings();
    return {
      title: { default: seo.title, template: `%s — ${store.name}` },
      description: seo.description || undefined,
      openGraph: {
        siteName: store.name,
        // Without a share image in Settings, the logo stands in.
        images: seo.ogImage
          ? [{ url: seo.ogImage.media.url, alt: seo.ogImage.alt }]
          : [{ url: "/images/logo-full.png", alt: store.name }],
      },
    };
  } catch {
    // API unreachable: the root layout's defaults apply.
    return {};
  }
}

// Storefront shell (PRD §5.1). The storefront's default voice is monospace.
// Announcement, logo, footer and chat links come from the dashboard.
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col font-mono">
      <div aria-hidden className="grain-overlay" />
      <Suspense fallback={null}>
        <AnnouncementSlot />
      </Suspense>
      <SiteHeader
        logo={
          <Suspense fallback={<BundledHeaderLogo />}>
            <HeaderLogoSlot />
          </Suspense>
        }
      />
      <main className="flex-1">{children}</main>
      <Suspense fallback={<SiteFooter site={null} store={null} />}>
        <FooterSlot />
      </Suspense>
      <Suspense fallback={null}>
        <FloatingContactSlot />
      </Suspense>
    </div>
  );
}
