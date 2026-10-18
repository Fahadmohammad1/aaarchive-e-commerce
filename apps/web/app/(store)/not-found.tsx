import { ArrowButton } from "@/components/store/arrow-button";
import { getMessages } from "@/lib/i18n/i18n";

// 404 (design §7.8): giant outlined number, one mono line, back to shop.
export default function StoreNotFound() {
  const t = getMessages().notFound;
  return (
    <div className="site-container flex min-h-[60dvh] flex-col items-center justify-center gap-6 py-20 text-center">
      <p
        aria-hidden
        className="wordmark-outline type-display-xl text-[28vw] leading-none md:text-[16rem]"
      >
        404
      </p>
      <h1 className="type-mono-label uppercase">{t.text}</h1>
      <ArrowButton href="/shop">{t.back}</ArrowButton>
    </div>
  );
}
