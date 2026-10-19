"use client";

import * as React from "react";

// Cloudflare Turnstile bot check (rules.md §8.2). Renders nothing when
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (local dev); the API then skips the
// check too. Production requires both keys.

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("turnstile")), {
      once: true,
    });
  });
}

export type TurnstileHandle = { reset: () => void };

export const TurnstileWidget = React.forwardRef<
  TurnstileHandle,
  { onToken: (token: string | null) => void }
>(function TurnstileWidget({ onToken }, ref) {
  const container = React.useRef<HTMLDivElement>(null);
  const widgetId = React.useRef<string | null>(null);
  const onTokenRef = React.useRef(onToken);
  onTokenRef.current = onToken;

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    },
  }));

  React.useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, []);

  if (!turnstileSiteKey) return null;
  return <div ref={container} className="min-h-[65px]" />;
});
