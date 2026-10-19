import { ArrowButton } from "@/components/store/arrow-button";
import { MediaImage } from "@/components/store/media-image";
import {
  ScrollSlider,
  ScrollSliderControls,
  ScrollSliderViewport,
} from "@/components/store/scroll-slider";
import { SectionHeading } from "@/components/store/section-heading";
import { Tag } from "@/components/store/tag";
import type { HomeContent } from "@/lib/content/content-store-schemas";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

const PLATFORM: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

type Social = NonNullable<HomeContent["social"]>;

// Follow our style journey (design §6.7, PRD H6). Heading from Content →
// Home; posts from Content → Social posts (images uploaded, no social API).
export function SocialSection({ social }: { social: Social }) {
  const t = getMessages();
  const label = social.heading.join(" ");
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="site-container">
        <SectionHeading
          align="center"
          lines={social.heading}
          intro={social.intro}
          className="mb-10 md:mb-14"
        />
        <ScrollSlider>
          <div className="mb-6 flex items-center justify-between">
            <ArrowButton href={social.followHref} external>
              {t.actions.followUs}
            </ArrowButton>
            {social.posts.length > 0 && (
              <ScrollSliderControls
                prevLabel={`${t.actions.previous} — ${label}`}
                nextLabel={`${t.actions.next} — ${label}`}
              />
            )}
          </div>
          {social.posts.length > 0 && (
            <ScrollSliderViewport
              label={label}
              className="-mx-4 scroll-px-4 gap-3 px-4 pt-6 pb-2 md:mx-0 md:scroll-px-0 md:gap-5 md:px-0 md:pb-16"
            >
              {social.posts.map((post, i) => (
                <a
                  key={post.id}
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={format(t.actions.viewPost, {
                    platform: PLATFORM[post.platform] ?? post.platform,
                  })}
                  className={cn(
                    "group/post relative w-[76%] shrink-0 snap-start sm:w-[40%] lg:w-[calc((100%-3*1.25rem)/4)]",
                    i % 2 === 1 && "md:translate-y-12",
                  )}
                >
                  <Tag className="absolute -top-5 left-0 z-10">
                    {post.label}
                  </Tag>
                  <div className="relative aspect-[3/4] overflow-hidden bg-sunken">
                    <MediaImage
                      media={post.image.media}
                      alt={post.image.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, 76vw"
                      className="object-cover transition-transform duration-400 ease-editorial group-hover/post:scale-[1.03]"
                    />
                  </div>
                </a>
              ))}
            </ScrollSliderViewport>
          )}
        </ScrollSlider>
      </div>
    </section>
  );
}
