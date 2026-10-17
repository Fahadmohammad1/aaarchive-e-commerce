"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// CSS scroll-snap slider with arrow buttons (design §6.3, §6.7). No carousel
// library: the viewport is a native scroll container, so swipe and keyboard
// scrolling work without JS; the arrows are an enhancement.

type SliderState = {
  viewportRef: React.RefObject<HTMLElement | null>;
  canPrev: boolean;
  canNext: boolean;
  scroll: (direction: -1 | 1) => void;
};

const SliderContext = React.createContext<SliderState | null>(null);

function useSlider() {
  const ctx = React.useContext(SliderContext);
  if (!ctx) throw new Error("ScrollSlider parts must be inside <ScrollSlider>");
  return ctx;
}

export function ScrollSlider({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const [edges, setEdges] = React.useState({ canPrev: false, canNext: true });

  const update = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setEdges({
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const scroll = React.useCallback((direction: -1 | 1) => {
    const el = viewportRef.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  return (
    <SliderContext.Provider value={{ viewportRef, ...edges, scroll }}>
      <div className={className}>{children}</div>
    </SliderContext.Provider>
  );
}

export function ScrollSliderViewport({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const { viewportRef } = useSlider();
  return (
    <section
      ref={viewportRef}
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable (design §11)
      tabIndex={0}
      className={cn(
        "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ScrollSliderControls({
  prevLabel,
  nextLabel,
  className,
}: {
  prevLabel: string;
  nextLabel: string;
  className?: string;
}) {
  const { canPrev, canNext, scroll } = useSlider();
  return (
    <div className={cn("flex gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={prevLabel}
        disabled={!canPrev}
        onClick={() => scroll(-1)}
        className="size-10 border-line-strong bg-background md:size-7 disabled:opacity-40"
      >
        <ChevronLeft strokeWidth={1.5} />
      </Button>
      <Button
        type="button"
        size="icon"
        aria-label={nextLabel}
        disabled={!canNext}
        onClick={() => scroll(1)}
        className="size-10 md:size-7 disabled:opacity-40"
      >
        <ChevronRight strokeWidth={1.5} />
      </Button>
    </div>
  );
}
