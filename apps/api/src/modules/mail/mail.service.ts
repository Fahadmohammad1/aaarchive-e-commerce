import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema.js";

const RESEND_URL = "https://api.resend.com/emails";

export type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Sends email through Resend's HTTP API (free tier; no SDK needed). Callers
 * send after their transaction commits and never fail a request over an
 * email (rules.md §4.3): every error is logged here and swallowed.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | undefined;
  private readonly from: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get("RESEND_API_KEY", { infer: true });
    this.from = config.get("MAIL_FROM", { infer: true });
  }

  /** `tag` identifies the mail in logs (an order number, never an address). */
  async send(mail: Mail, tag: string): Promise<boolean> {
    if (!this.apiKey || !this.from) {
      this.logger.log(`Email skipped (Resend not configured): ${tag}`);
      return false;
    }
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: this.from, ...mail, to: [mail.to] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.error(`Email failed (${res.status}): ${tag}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Email failed: ${tag}: ${String(error)}`);
      return false;
    }
  }
}
