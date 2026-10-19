import { connection } from "next/server";
import { JsonLd, siteUrl } from "@/components/store/json-ld";
import { Logo } from "@/components/store/logo";
import { MediaImage } from "@/components/store/media-image";
import { AnalyticsTags } from "@/lib/analytics/analytics-tags";
import {
  getSiteContent,
  getStoreSettings,
} from "@/lib/content/content-store-api";
import { AnnouncementBar } from "./announcement-bar";
import { FloatingContact } from "./floating-contact";
import { SiteFooter } from "./site-footer";

// Site chrome that comes from the dashboard (PRD §5.1, §6.7). Each slot sits
// in <Suspense> in the layout: connection() keeps the API out of the build,
// and the cached fetchers make every request fast.

export async function AnnouncementSlot() {
  await connection();
  const { announcement } = await getSiteContent();
  return announcement ? <AnnouncementBar message={announcement} /> : null;
}

/** Header logo: the uploaded one (Settings → Store), else the bundled wordmark. */
export async function HeaderLogoSlot() {
  await connection();
  const { store } = await getStoreSettings();
  if (!store.logo) return <BundledHeaderLogo />;
  return (
    <span className="relative block h-8 w-28 md:h-10 md:w-32">
      <MediaImage
        media={store.logo.media}
        alt={store.name}
        sizes="128px"
        fill
        priority
        className="object-contain"
      />
    </span>
  );
}

export function BundledHeaderLogo() {
  return (
    <Logo
      alt=""
      eager
      sizes="(min-width: 768px) 128px, 104px"
      className="h-8 w-auto md:h-10"
    />
  );
}

export async function FooterSlot() {
  await connection();
  const [site, settings] = await Promise.all([
    getSiteContent(),
    getStoreSettings(),
  ]);
  const { store } = settings;
  return (
    <>
      <SiteFooter site={site} store={store} year={new Date().getFullYear()} />
      {/* Organization structured data (PRD §9.2), from Settings + footer links. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: store.name,
          url: siteUrl("/"),
          logo: store.logo?.media.url ?? siteUrl("/images/logo-full.png"),
          ...(site.footer?.socials.length
            ? { sameAs: site.footer.socials.map((s) => s.href) }
            : {}),
          ...(store.phone || store.email
            ? {
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "customer service",
                  areaServed: "BD",
                  ...(store.phone ? { telephone: `+88${store.phone}` } : {}),
                  ...(store.email ? { email: store.email } : {}),
                },
              }
            : {}),
        }}
      />
    </>
  );
}

export async function FloatingContactSlot() {
  await connection();
  const { store, tracking } = await getStoreSettings();
  return (
    <>
      <FloatingContact whatsapp={store.whatsapp} messenger={store.messenger} />
      {/* Analytics tags (PRD §10), storefront only, IDs from Settings. */}
      <AnalyticsTags
        ga4Id={tracking.ga4Id}
        metaPixelId={tracking.metaPixelId}
        clarityId={tracking.clarityId}
      />
    </>
  );
}
