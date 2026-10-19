import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RichText } from "@/components/store/rich-text";
import {
  getStorePage,
  getStoreSettings,
} from "@/lib/content/content-store-api";
import { getMessages } from "@/lib/i18n/i18n";
import { ContentPageSkeleton } from "../_components/content-page";
import { ContactForm } from "./contact-form";

const t = getMessages().contact;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: { canonical: "/contact" },
};

/**
 * Contact (PRD §5.11): intro from Content → Pages ("contact"), phone,
 * WhatsApp, Messenger, email and address from Settings → Store, and a form
 * that is mailed to the store.
 */
async function ContactDetails() {
  await connection();
  const [page, { store }] = await Promise.all([
    getStorePage("contact"),
    getStoreSettings(),
  ]);
  type Row = { label: string; value: string; href: string | null };
  const rows: Row[] = [];
  if (store.phone) {
    rows.push({
      label: t.phone,
      value: store.phone,
      href: `tel:${store.phone}`,
    });
  }
  if (store.whatsapp) {
    rows.push({
      label: t.whatsapp,
      value: store.whatsapp,
      href: `https://wa.me/88${store.whatsapp}`,
    });
  }
  if (store.messenger) {
    rows.push({
      label: t.messenger,
      value: store.messenger,
      href: store.messenger,
    });
  }
  if (store.email) {
    rows.push({
      label: t.email,
      value: store.email,
      href: `mailto:${store.email}`,
    });
  }
  if (store.address) {
    rows.push({ label: t.address, value: store.address, href: null });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-5">
        {page && (
          <RichText
            source={page.content}
            className="max-w-[68ch] type-text-body text-muted-foreground"
          />
        )}
        {rows.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="uppercase type-mono-label">{t.reach}</h2>
            <dl className="flex flex-col border-t">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex flex-wrap justify-between gap-2 border-b py-3"
                >
                  <dt className="text-muted-foreground type-mono-label">
                    {r.label}
                  </dt>
                  <dd className="break-all type-mono-label">
                    {r.href ? (
                      <a
                        href={r.href}
                        className="hover:text-primary"
                        {...(r.href.startsWith("https://")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {r.value}
                      </a>
                    ) : (
                      <span className="whitespace-pre-line">{r.value}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        <ContactForm />
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="site-container flex flex-col gap-8 py-12 md:py-20">
      <h1 className="type-display-lg">{t.title}</h1>
      <Suspense fallback={<ContentPageSkeleton />}>
        <ContactDetails />
      </Suspense>
    </div>
  );
}
