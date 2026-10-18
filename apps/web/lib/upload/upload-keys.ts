import type { MediaPurpose } from "@aaarchive/shared/media";

export const mediaKeys = {
  all: ["media"] as const,
  list: (purpose: MediaPurpose | undefined) =>
    [...mediaKeys.all, "list", purpose ?? "all"] as const,
};
