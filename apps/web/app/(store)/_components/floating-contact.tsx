import { MessageCircle, MessagesSquare } from "lucide-react";
import { contactLinks } from "@/lib/content/home-fixtures";
import { getMessages } from "@/lib/i18n/i18n";

// Click-to-chat buttons on every page (PRD §5.1). Plain links, no widget.
export function FloatingContact() {
  const t = getMessages();
  const items = [
    {
      href: contactLinks.whatsapp,
      label: t.contact.whatsapp,
      Icon: MessageCircle,
      accent: true,
    },
    {
      href: contactLinks.messenger,
      label: t.contact.messenger,
      Icon: MessagesSquare,
      accent: false,
    },
  ];
  return (
    <div className="fixed right-4 bottom-[calc(1rem+var(--buy-bar-h,0px))] z-30 flex flex-col gap-1 transition-[bottom] duration-250">
      {items.map(({ href, label, Icon, accent }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={
            accent
              ? "grid size-11 place-items-center bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
              : "grid size-11 place-items-center border border-line-strong bg-card text-foreground transition-colors hover:border-foreground"
          }
        >
          <Icon aria-hidden strokeWidth={1.5} className="size-5" />
        </a>
      ))}
    </div>
  );
}
