// A non-sensitive "probably signed in" cookie. It lets proxy.ts redirect guests
// away from /admin before any HTML renders; it grants nothing — the API checks
// the real token on every request (docs/architecture.md §4.10).
export const SESSION_HINT_COOKIE = "aar_session";

const FOURTEEN_DAYS = 14 * 24 * 60 * 60;

export function setSessionHint(): void {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not in every browser staff use; this cookie holds no secret
  document.cookie = `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=${FOURTEEN_DAYS}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

export function clearSessionHint(): void {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not in every browser staff use; this cookie holds no secret
  document.cookie = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
