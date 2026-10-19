"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { trackPageView } from "./analytics";

// Loads GA4, Meta Pixel and Microsoft Clarity (PRD §10) with the IDs from
// Settings → Tracking. Storefront only (never /admin). Scripts are injected
// after the page is idle so they never compete with the LCP image; an empty
// ID means that tag is off. Every domain is listed in the CSP (next.config.ts).

type Ids = { ga4Id: string; metaPixelId: string; clarityId: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    _fbq?: unknown;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

function addScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  document.head.appendChild(el);
}

function load({ ga4Id, metaPixelId, clarityId }: Ids) {
  if (ga4Id && !window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    // Page views are sent by trackPageView on each navigation.
    window.gtag("config", ga4Id, { send_page_view: false });
    addScript(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`,
    );
  }
  if (metaPixelId && !window.fbq) {
    const fbq = ((...args: unknown[]) => {
      (fbq as unknown as { queue: unknown[] }).queue.push(args);
    }) as Window["fbq"] & {
      queue: unknown[];
      loaded: boolean;
      version: string;
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
    fbq("init", metaPixelId);
    addScript("https://connect.facebook.net/en_US/fbevents.js");
  }
  if (clarityId && !window.clarity) {
    const clarity = ((...args: unknown[]) => {
      clarity.q = clarity.q ?? [];
      clarity.q.push(args);
    }) as NonNullable<Window["clarity"]>;
    window.clarity = clarity;
    addScript(`https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
  }
}

export function AnalyticsTags(ids: Ids) {
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const any = Boolean(ids.ga4Id || ids.metaPixelId || ids.clarityId);

  React.useEffect(() => {
    if (!any) return;
    const start = () => {
      load(ids);
      setReady(true);
    };
    // After the page is idle (or 3 s at most), never before first paint.
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 1500));
    const handle = idle(start, { timeout: 3000 } as never);
    return () => {
      if (window.cancelIdleCallback && typeof handle === "number")
        window.cancelIdleCallback(handle);
    };
  }, [any, ids]);

  React.useEffect(() => {
    if (ready) trackPageView(pathname);
  }, [ready, pathname]);

  return null;
}
