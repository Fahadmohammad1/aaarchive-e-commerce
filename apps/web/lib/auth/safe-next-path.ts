/**
 * Where to go after signing in. Only same-site admin paths are accepted, so a
 * crafted ?next= link cannot send someone to another website (open redirect).
 */
export function safeNextPath(next: string | null | undefined): string {
  const fallback = "/admin";
  if (!next) return fallback;
  if (!next.startsWith("/admin")) return fallback;
  if (next.startsWith("//") || next.includes("\\")) return fallback;
  if (next.startsWith("/admin/login")) return fallback;
  try {
    // Must stay on this origin after URL parsing too.
    const url = new URL(next, "https://aaarchive.invalid");
    if (url.origin !== "https://aaarchive.invalid") return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
