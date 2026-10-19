import type { Metadata } from "next";
import { SocialPostsScreen } from "./_components/social-posts-screen";

export const metadata: Metadata = { title: "Social posts" };
export const instant = false;

export default function SocialPostsPage() {
  return <SocialPostsScreen />;
}
