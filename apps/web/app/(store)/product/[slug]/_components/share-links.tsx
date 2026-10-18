"use client";

import { Link2 } from "lucide-react";
import * as React from "react";
import { getMessages } from "@/lib/i18n/i18n";

/** Copy link · Facebook · WhatsApp (PRD §5.5). Plain links, no SDKs. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const t = getMessages().pdp;
  const [copied, setCopied] = React.useState(false);
  const encoded = encodeURIComponent(url);
  const chip =
    "inline-flex h-8 items-center gap-1.5 border border-line-strong px-2 type-mono-label hover:border-foreground";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-muted-foreground type-mono-label uppercase">
        {t.share}
      </span>
      <button
        type="button"
        className={chip}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Link2 aria-hidden strokeWidth={1.5} className="size-3.5" />
        <span aria-live="polite">{copied ? t.copied : t.copyLink}</span>
      </button>
      <a
        className={chip}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.shareFacebook}
      >
        FB
      </a>
      <a
        className={chip}
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.shareWhatsapp}
      >
        WA
      </a>
    </div>
  );
}
