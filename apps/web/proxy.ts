import { type NextRequest, NextResponse } from "next/server";

// Next 16 "proxy" (formerly middleware).
//
// /api/v1/*: attach the shared secret that proves the request came through
// this website (docs/rules.md §8). Whatever a visitor sent in that header is
// dropped first, so it can never be forged from the browser.
//
// /admin/*: optimistic guard — guests without the session-hint cookie are sent
// to the login page before any dashboard HTML renders. The hint grants
// nothing; the API checks the real token on every request.
const PROXY_SECRET_HEADER = "x-aaarchive-proxy";
// Marks the website server's own page-render reads (lib/api); a visitor must
// never be able to send it, or they could skip the API's rate limit.
const SERVER_RENDER_HEADER = "x-aaarchive-ssr";
const SESSION_HINT_COOKIE = "aar_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    if (!isLogin && !request.cookies.has(SESSION_HINT_COOKIE)) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.delete(PROXY_SECRET_HEADER);
  headers.delete(SERVER_RENDER_HEADER);
  const secret = process.env.API_PROXY_SECRET;
  if (secret) headers.set(PROXY_SECRET_HEADER, secret);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/v1/:path*", "/admin/:path*"],
};
