import { connection } from "next/server";
import { Suspense } from "react";
import { getHomeContent } from "@/lib/content/content-store-api";
import { CategorySection } from "./_components/category-section";
import { CollectionsSection } from "./_components/collections-section";
import { HeroSection } from "./_components/hero-section";
import { HomeSkeleton } from "./_components/home-skeleton";
import { LookFileSection } from "./_components/look-file-section";
import { MadeToKeepSection } from "./_components/made-to-keep-section";
import { SocialSection } from "./_components/social-section";

/**
 * Every section comes from Content → Home (PRD §5.2, §6.7). A section the
 * owner has not set up yet (null) is left out. connection() keeps the API
 * out of the build; the cached fetcher serves each request.
 */
async function HomeSections() {
  await connection();
  const home = await getHomeContent();
  return (
    <>
      {home.hero && <HeroSection hero={home.hero} />}
      {home.categories && <CategorySection section={home.categories} />}
      {home.lookFile && <LookFileSection look={home.lookFile} />}
      {home.latest && <CollectionsSection latest={home.latest} />}
      {home.promises && <MadeToKeepSection section={home.promises} />}
      {home.social && <SocialSection social={home.social} />}
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeSections />
    </Suspense>
  );
}
