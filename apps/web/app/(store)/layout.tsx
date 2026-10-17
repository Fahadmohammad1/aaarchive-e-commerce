import { announcement } from "@/lib/content/home-fixtures";
import { AnnouncementBar } from "./_components/announcement-bar";
import { FloatingContact } from "./_components/floating-contact";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

// Storefront shell (PRD §5.1). The storefront's default voice is monospace.
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col font-mono">
      <div aria-hidden className="grain-overlay" />
      <AnnouncementBar message={announcement} />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
