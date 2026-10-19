import type { MediaAsset } from "@aaarchive/shared/media";

export type SectionFormProps = {
  initial: unknown;
  media: Record<string, MediaAsset>;
  products: Record<string, { name: string; slug: string; status: string }>;
  canEdit: boolean;
};
