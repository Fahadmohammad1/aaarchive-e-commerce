import type { contactMessageSchema } from "@aaarchive/shared/content";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { z } from "zod";
import { TurnstileService } from "../auth/turnstile.service.js";
import { MailService } from "../mail/mail.service.js";
import { SettingsService } from "../settings/settings.service.js";

type Input = z.output<typeof contactMessageSchema>;

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Contact form (PRD §5.11): mailed to the store's inbox (Settings → Store
 * email). Nothing is stored. Without an inbox or mail setup the form says
 * so, and the page's WhatsApp/Messenger links remain.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly turnstile: TurnstileService,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  async send(input: Input, ip: string | undefined) {
    await this.turnstile.verify(input.turnstileToken, ip);
    const { email, name: store } = await this.settings.store();
    const unavailable = () =>
      new ServiceUnavailableException({
        message: "Messages cannot be sent right now",
        code: "CONTACT_UNAVAILABLE",
      });
    if (!email) throw unavailable();
    const text = `From: ${input.name}\nReply to: ${input.contact}\n\n${input.message}`;
    const sent = await this.mail.send(
      {
        to: email,
        subject: `${store} contact form: ${input.name}`,
        text,
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5"><p><strong>From:</strong> ${esc(input.name)}<br><strong>Reply to:</strong> ${esc(input.contact)}</p><p style="white-space:pre-line">${esc(input.message)}</p></body></html>`,
      },
      "contact form",
    );
    if (!sent) throw unavailable();
    this.logger.log("Contact message sent");
    return { sent: true };
  }
}
