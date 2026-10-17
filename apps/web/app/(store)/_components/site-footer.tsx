import Image from "next/image";
import Link from "next/link";
import { KanthaDivider } from "@/components/store/kantha-divider";
import { Logo } from "@/components/store/logo";
import { Tag } from "@/components/store/tag";
import { footer } from "@/lib/content/home-fixtures";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

// Footer (design §6.8).
export function SiteFooter() {
  const t = getMessages();
  const policies = [
    { label: t.footer.privacy, href: "/policies/privacy" },
    { label: t.footer.terms, href: "/policies/terms" },
    { label: t.footer.returns, href: "/policies/returns" },
  ];
  const nav = [
    { label: t.nav.home, href: "/" },
    { label: t.nav.about, href: "/about" },
    { label: t.nav.collections, href: "/collection/archive-01-winter-drop" },
    { label: t.nav.shop, href: "/shop" },
    { label: t.nav.faq, href: "/faq" },
    { label: t.nav.trackOrder, href: "/track-order" },
    { label: t.nav.contact, href: "/contact" },
  ];

  return (
    <footer className="mt-auto bg-sunken">
      <KanthaDivider />
      <div className="site-container flex flex-col items-center gap-8 pt-16 text-center md:pt-24">
        <Logo
          variant="full"
          sizes="(min-width: 768px) 360px, 260px"
          className="w-64 md:w-[22.5rem]"
        />
        <p className="max-w-[48ch] text-muted-foreground type-mono-body">
          {footer.blurb}
        </p>
        <ul aria-label={t.footer.social} className="flex gap-1">
          {footer.socials.map((s, i) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className={cn(
                  "grid size-10 place-items-center type-mono-label transition-colors",
                  i === 0
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-line-strong hover:border-foreground",
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="relative aspect-[4/3] w-full max-w-4xl overflow-hidden bg-background md:aspect-[16/6]">
          <Image
            src={footer.image}
            alt="Inside the Aaarchive studio"
            fill
            sizes="(min-width: 896px) 56rem, 100vw"
            quality={60}
            className="object-cover"
          />
        </div>

        <nav aria-label={t.footer.policies} className="w-full border-t pt-6">
          <ul className="flex flex-wrap justify-center gap-2">
            {policies.map((p) => (
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
      </div>

      <nav aria-label="Footer" className="site-container mt-8">
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

      <p className="mt-8 border-t py-6 text-center text-muted-foreground type-mono-micro">
        {format(t.footer.rights, { year: 2026 })}
      </p>
    </footer>
  );
}
