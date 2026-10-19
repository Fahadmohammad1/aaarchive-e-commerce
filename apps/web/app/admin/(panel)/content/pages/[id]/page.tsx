import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { PageEditorRoute } from "../_components/page-editor";

export const metadata: Metadata = { title: "Edit page" };
export const instant = false;

export default function EditPagePage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <PageEditorRoute />
    </Suspense>
  );
}
