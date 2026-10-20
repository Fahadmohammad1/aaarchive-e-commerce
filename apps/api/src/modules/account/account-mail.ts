import { escapeHtml as esc } from "../mail/escape-html.js";
import type { Mail } from "../mail/mail.service.js";

// Short, plain emails for customer accounts (PRD §5.10, §11).

function linkMail(o: {
  to: string;
  subject: string;
  name: string;
  intro: string;
  action: string;
  link: string;
  outro: string;
}): Mail {
  const text = [
    `Hi ${o.name},`,
    "",
    o.intro,
    "",
    `${o.action}: ${o.link}`,
    "",
    o.outro,
    "",
    "Aaarchive",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1a1714;line-height:1.5">
<p>Hi ${esc(o.name)},</p>
<p>${esc(o.intro)}</p>
<p><a href="${esc(o.link)}">${esc(o.action)}</a></p>
<p>${esc(o.outro)}</p>
<p>Aaarchive</p>
</body></html>`;
  return { to: o.to, subject: o.subject, html, text };
}

export function verifyEmailMail(name: string, to: string, link: string): Mail {
  return linkMail({
    to,
    name,
    link,
    subject: "Confirm your Aaarchive email",
    intro:
      "Please confirm this email address. Orders you placed with it will then show in your account.",
    action: "Confirm email",
    outro: "If you did not create an Aaarchive account, ignore this email.",
  });
}

export function resetPasswordMail(
  name: string,
  to: string,
  link: string,
): Mail {
  return linkMail({
    to,
    name,
    link,
    subject: "Reset your Aaarchive password",
    intro: "Someone asked to reset the password of your Aaarchive account.",
    action: "Choose a new password",
    outro:
      "The link works once, for 30 minutes. If you did not ask for it, ignore this email: your password stays the same.",
  });
}
