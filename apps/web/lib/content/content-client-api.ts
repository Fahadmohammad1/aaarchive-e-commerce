import type { ContactMessageInput } from "@aaarchive/shared/content";
import { api } from "@/lib/api/api-client";
import type { SiteContent } from "./content-store-schemas";

// Storefront browser calls: `import type` only, no Zod at runtime
// (rules.md §4.2). The server fetchers validate the same responses.

export function getSiteContentClient(
  signal?: AbortSignal,
): Promise<SiteContent> {
  return api.get<SiteContent>("/content/site", { signal });
}

export function sendContactMessage(body: ContactMessageInput) {
  return api.post<{ sent: true }>("/contact", { body });
}
