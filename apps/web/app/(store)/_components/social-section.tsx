import Image from "next/image";
import { ArrowButton } from "@/components/store/arrow-button";
import {
  ScrollSlider,
  ScrollSliderControls,
  ScrollSliderViewport,
} from "@/components/store/scroll-slider";
import { SectionHeading } from "@/components/store/section-heading";
import { Tag } from "@/components/store/tag";
import { social } from "@/lib/content/home-fixtures";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

// Follow our style journey (design §6.7, PRD H6). Images are uploaded in the
// admin — no social API.
export function SocialSection() {
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
            <ScrollSliderControls
              prevLabel={`${t.actions.previous} — ${label}`}
              nextLabel={`${t.actions.next} — ${label}`}
            />
          </div>
          <ScrollSliderViewport
            label={label}
            className="-mx-4 scroll-px-4 gap-3 px-4 pt-6 pb-2 md:mx-0 md:scroll-px-0 md:gap-5 md:px-0 md:pb-16"
          >
            {social.posts.map((post, i) => (
              <a
                key={post.id}
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={format(t.actions.viewPost, {
                  platform: post.platform,
                })}
                className={cn(
                  "group/post relative w-[76%] shrink-0 snap-start sm:w-[40%] lg:w-[calc((100%-3*1.25rem)/4)]",
                  i % 2 === 1 && "md:translate-y-12",
                )}
              >
                <Tag className="absolute -top-5 left-0 z-10">{post.label}</Tag>
                <div className="relative aspect-[3/4] overflow-hidden bg-sunken">
                  <Image
                    src={post.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 76vw"
                    quality={60}
                    className="object-cover transition-transform duration-400 ease-editorial group-hover/post:scale-[1.03]"
                  />
                </div>
              </a>
            ))}
          </ScrollSliderViewport>
        </ScrollSlider>
      </div>
    </section>
  );
}
