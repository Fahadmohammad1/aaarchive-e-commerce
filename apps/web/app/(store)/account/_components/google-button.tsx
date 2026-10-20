"use client";

import { googleSignInUrl } from "@/lib/account/account-api";
import { getMessages } from "@/lib/i18n/i18n";
import { usePublicSettings } from "@/lib/settings/use-public-settings";

/** Shown only when the API has Google credentials (Settings → public). */
export function GoogleButton({ next }: { next: string }) {
  const t = getMessages().account;
  const settings = usePublicSettings();
  if (!settings.data?.accounts.google) return null;
  return (
    <>
      {/* A full-page navigation: Google's OAuth flow redirects back to the API. */}
      <a
        href={googleSignInUrl(next)}
        className="flex h-11 w-full items-center justify-center border border-line-strong px-3 uppercase type-mono-label transition-colors hover:border-foreground"
      >
        {t.google}
      </a>
      <div
        aria-hidden
        className="flex items-center gap-3 text-subtle type-mono-micro"
      >
        <span className="h-px flex-1 bg-border" />
        {t.or}
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
