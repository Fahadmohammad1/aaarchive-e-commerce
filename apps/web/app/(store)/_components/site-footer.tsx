import Link from "next/link";
import { KanthaDivider } from "@/components/store/kantha-divider";
import { Logo } from "@/components/store/logo";
import { MediaImage } from "@/components/store/media-image";
import { Tag } from "@/components/store/tag";
import type {
  SiteContent,
  StorePublicSettings,
} from "@/lib/content/content-store-schemas";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

const SOCIAL_SHORT: Record<string, string> = {
  FACEBOOK: "FB",
  INSTAGRAM: "IG",
  TIKTOK: "TT",
  WHATSAPP: "WA",
  MESSENGER: "MS",
  YOUTUBE: "YT",
};
const SOCIAL_NAME: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
  YOUTUBE: "YouTube",
};

// Footer (design §6.8). Blurb, photo, social links, policy chips and the link
// bar come from Content → Site; the logo from Settings → Store.
export function SiteFooter({
  site,
  store,
  year,
}: {
  /** null while streaming in (the fallback keeps the frame). */
  site: SiteContent | null;
  store: StorePublicSettings["store"] | null;
  /** Passed from request time: the prerendered fallback has no clock. */
  year?: number;
}) {
  const t = getMessages();
  const footer = site?.footer ?? null;
  const nav = site?.navigation?.footer ?? [];
  const name = store?.name ?? t.brand;

  return (
    <footer className="mt-auto bg-sunken">
      <KanthaDivider />
      <div className="site-container flex flex-col items-center gap-8 pt-16 text-center md:pt-24">
        {store?.logo ? (
          <span className="relative block h-24 w-64 md:h-32 md:w-[22.5rem]">
            <MediaImage
              media={store.logo.media}
              alt={name}
              sizes="(min-width: 768px) 360px, 260px"
              fill
              className="object-contain"
            />
          </span>
        ) : (
          <Logo
            variant="full"
            alt={name}
            sizes="(min-width: 768px) 360px, 260px"
            className="w-64 md:w-[22.5rem]"
          />
        )}
        {footer?.blurb && (
          <p className="max-w-[48ch] text-muted-foreground type-mono-body">
            {footer.blurb}
          </p>
        )}
        {footer && footer.socials.length > 0 && (
          <ul aria-label={t.footer.social} className="flex gap-1">
            {footer.socials.map((s, i) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL_NAME[s.platform]}
                  className={cn(
                    "grid size-10 place-items-center type-mono-label transition-colors",
                    i === 0
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                      : "border border-line-strong hover:border-foreground",
                  )}
                >
                  {SOCIAL_SHORT[s.platform]}
                </a>
              </li>
            ))}
          </ul>
        )}

        {footer?.image && (
          <div className="relative aspect-[4/3] w-full max-w-4xl overflow-hidden bg-background md:aspect-[16/6]">
            <MediaImage
              media={footer.image.media}
              alt={footer.image.alt}
              fill
              sizes="(min-width: 896px) 56rem, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {footer && footer.policyLinks.length > 0 && (
          <nav aria-label={t.footer.policies} className="w-full border-t pt-6">
            <ul className="flex flex-wrap justify-center gap-2">
              {footer.policyLinks.map((p) => (
                <li key={p.href}>
                  <Tag
                    asChild
                    tone="outline"
                    className="h-6 hover:border-foreground"
                  >
                    <Link href={p.href}>{p.label}</Link>
                  </Tag>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {nav.length > 0 && (
        <nav aria-label={t.footer.nav} className="site-container mt-8">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 bg-cream px-4 py-3 text-cream-foreground md:justify-between md:px-6">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="type-mono-label hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="mt-8 min-h-[4.25rem] border-t py-6 text-center text-muted-foreground type-mono-micro">
        {year && format(t.footer.rights, { year, name })}
      </p>
    </footer>
  );
}
