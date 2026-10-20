import { createHash, randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema.js";

// Google sign-in for customers (PRD §5.10): OAuth 2.0 authorisation code flow
// with PKCE, called with fetch (no SDK). The ID token comes straight from
// Google's token endpoint over TLS, authenticated with our client secret, so
// its claims are checked but its signature need not be (OpenID Connect Core
// §3.1.3.7).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleIdentity = { sub: string; email: string; name: string };

/** What the browser keeps (in an httpOnly cookie) between start and callback. */
export type GoogleState = { state: string; verifier: string; next: string };

/** Checks the ID token's claims; null when it is not a usable sign-in. */
export function checkGoogleClaims(
  claims: Record<string, unknown>,
  clientId: string,
  nowSeconds: number,
): GoogleIdentity | null {
  const { iss, aud, exp, sub, email, email_verified, name } = claims;
  if (typeof iss !== "string" || !ISSUERS.includes(iss)) return null;
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(clientId)) return null;
  if (typeof exp !== "number" || exp <= nowSeconds) return null;
  if (typeof sub !== "string" || sub.length === 0) return null;
  // Only a verified address may match an existing account by email.
  if (typeof email !== "string" || email_verified !== true) return null;
  return {
    sub,
    email: email.trim().toLowerCase(),
    name:
      typeof name === "string" && name.trim().length >= 2
        ? name.trim().slice(0, 60)
        : email.split("@")[0].slice(0, 60),
  };
}

/** Payload of a JWT, without verifying it (see the note at the top). */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const part = jwt.split(".")[1];
  if (!part) return null;
  try {
    const value: unknown = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8"),
    );
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string;

  constructor(config: ConfigService<Env, true>) {
    this.clientId = config.get("GOOGLE_CLIENT_ID", { infer: true });
    this.clientSecret = config.get("GOOGLE_CLIENT_SECRET", { infer: true });
    const origin = new URL(config.get("FRONTEND_ORIGIN", { infer: true }))
      .origin;
    // Through the website's /api/v1 proxy, like every other API call.
    this.redirectUri = `${origin}/api/v1/account/auth/google/callback`;
  }

  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /** A fresh state + PKCE pair and the Google URL to send the browser to. */
  start(next: string): { url: string; state: GoogleState } {
    const state = randomBytes(24).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.clientId ?? "",
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    return { url: url.toString(), state: { state, verifier, next } };
  }

  /** Exchanges the callback's code for the person's verified identity. */
  async identify(code: string, verifier: string): Promise<GoogleIdentity> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Google sign-in is not configured");
    }
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      this.logger.warn(`Google token exchange failed (${res.status})`);
      throw new Error("Google token exchange failed");
    }
    const body = (await res.json()) as { id_token?: unknown };
    const claims =
      typeof body.id_token === "string"
        ? decodeJwtPayload(body.id_token)
        : null;
    const identity = claims
      ? checkGoogleClaims(claims, this.clientId, Math.floor(Date.now() / 1000))
      : null;
    if (!identity) throw new Error("Google ID token refused");
    return identity;
  }
}
