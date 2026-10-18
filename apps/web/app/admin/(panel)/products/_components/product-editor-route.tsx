"use client";

import { useParams } from "next/navigation";
import { ProductEditor } from "./product-editor";

export function ProductEditorRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProductEditor id={id} />;
}
