import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { SectionEditorRoute } from "../_components/section-editor";

export const metadata: Metadata = { title: "Edit content" };
// Rendered after the browser session check: see ../../layout.tsx.
export const instant = false;

export default function ContentSectionPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <SectionEditorRoute />
    </Suspense>
  );
}
