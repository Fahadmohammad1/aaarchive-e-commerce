import { CategorySection } from "./_components/category-section";
import { CollectionsSection } from "./_components/collections-section";
import { HeroSection } from "./_components/hero-section";
import { LookFileSection } from "./_components/look-file-section";
import { MadeToKeepSection } from "./_components/made-to-keep-section";
import { SocialSection } from "./_components/social-section";

// Home (design §6, PRD §5.2). Content is fixture data until Phase 6.
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategorySection />
      <LookFileSection />
      <CollectionsSection />
      <MadeToKeepSection />
      <SocialSection />
    </>
  );
}
