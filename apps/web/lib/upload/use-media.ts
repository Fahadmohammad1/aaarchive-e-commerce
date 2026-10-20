"use client";

import type { MediaPurpose } from "@aaarchive/shared/media";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { shrinkForUpload } from "./shrink-image";
import { listMedia, uploadMedia } from "./upload-api";
import { mediaKeys } from "./upload-keys";

export function useMediaLibrary(
  purpose: MediaPurpose | undefined,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: mediaKeys.list(purpose),
    queryFn: ({ pageParam, signal }) => listMedia(purpose, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.limit < last.meta.total
        ? last.meta.page + 1
        : undefined,
    enabled,
  });
}

export function useUploadMedia(purpose: MediaPurpose) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      uploadMedia(await shrinkForUpload(file), purpose),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}
