import { ArrowButton } from "@/components/store/arrow-button";
import { getMessages } from "@/lib/i18n/i18n";

// 404 for addresses outside the storefront layout (design §7.8): giant
// outlined number, one mono line, back to shop. Store pages use
// (store)/not-found.tsx, which keeps the header and footer.
export default function NotFound() {
  const t = getMessages().notFound;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-20 text-center font-mono">
      <div aria-hidden className="grain-overlay" />
      <p
        aria-hidden
        className="wordmark-outline type-display-xl text-[28vw] leading-none md:text-[16rem]"
      >
        404
      </p>
      <h1 className="type-mono-label uppercase">{t.text}</h1>
      <ArrowButton href="/shop">{t.back}</ArrowButton>
    </main>
  );
}
