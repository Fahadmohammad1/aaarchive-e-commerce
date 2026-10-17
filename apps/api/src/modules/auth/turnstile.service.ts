import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile bot check (rules.md §8.2, §8.5). Skipped when
 * TURNSTILE_SECRET_KEY is unset — local dev only; production refuses to start
 * without it.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger("Security");
  private readonly secret: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get("TURNSTILE_SECRET_KEY", { infer: true });
  }

  async verify(
    token: string | undefined,
    ip: string | undefined,
  ): Promise<void> {
    if (!this.secret) return;
    if (!token) throw failed();

    const body = new URLSearchParams({ secret: this.secret, response: token });
    if (ip) body.set("remoteip", ip);
    try {
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success === true) return;
    } catch (error) {
      this.logger.error(`Turnstile verification unavailable: ${String(error)}`);
    }
    throw failed();
  }
}

function failed() {
  return new ForbiddenException({
    message: "Please complete the security check and try again",
    code: "TURNSTILE_FAILED",
  });
}
