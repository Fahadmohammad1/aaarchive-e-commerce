import {
  REVALIDATE_MAX_TAGS,
  REVALIDATE_SECRET_HEADER,
} from "@aaarchive/shared/cache-tags";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema.js";

/**
 * Tells the website which cached storefront data is stale after an admin
 * write (docs/architecture.md §3.1, §4.6). Runs after the database write has
 * committed; a failure is logged and never fails the admin's request
 * (rules.md §4.3). Without FRONTEND_REVALIDATE_URL (local dev) it does nothing.
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);
  private readonly url: string | undefined;
  private readonly secret: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get("FRONTEND_REVALIDATE_URL", { infer: true });
    this.secret = config.get("REVALIDATE_SECRET", { infer: true });
  }

  async revalidate(tags: readonly string[]): Promise<void> {
    const unique = [...new Set(tags)].slice(0, REVALIDATE_MAX_TAGS);
    if (!this.url || !this.secret || unique.length === 0) return;
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [REVALIDATE_SECRET_HEADER]: this.secret,
        },
        body: JSON.stringify({ tags: unique }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.error(
          `Revalidation of [${unique.join(", ")}] failed: HTTP ${res.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Revalidation of [${unique.join(", ")}] failed: ${String(error)}`,
      );
    }
  }
}
