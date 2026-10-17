import Image from "next/image";
import { cn } from "@/lib/utils";
import logoFull from "@/public/images/logo-full.png";
import logoWordmark from "@/public/images/logo-wordmark.png";

// The Aaarchive logo. Both files are cut from public/logo.png with the black
// background turned into transparency, so they sit on any surface.
//  - wordmark: "aaarchive" + swoosh, for the header and menu
//  - full: adds the stars and "Archive the essence", for the footer
const SOURCES = { wordmark: logoWordmark, full: logoFull } as const;

export function Logo({
  variant = "wordmark",
  alt = "Aaarchive",
  eager = false,
  sizes,
  className,
}: {
  variant?: keyof typeof SOURCES;
  alt?: string;
  eager?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <Image
      src={SOURCES[variant]}
      alt={alt}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      className={cn("h-auto w-auto select-none", className)}
    />
  );
}
