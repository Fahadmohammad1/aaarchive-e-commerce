"use client";

import type {
  ContentKey,
  FaqInput,
  PageInput,
  SocialPostInput,
} from "@aaarchive/shared/content";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFaq,
  createPage,
  createSocialPost,
  deleteFaq,
  deletePage,
  deleteSocialPost,
  getPage,
  listContent,
  listFaq,
  listPages,
  listSocialPosts,
  saveContent,
  updateFaq,
  updatePage,
  updateSocialPost,
} from "./content-api";
import { contentKeys } from "./content-keys";

export function useContentBlocks() {
  return useQuery({
    queryKey: contentKeys.admin(),
    queryFn: ({ signal }) => listContent(signal),
  });
}

export function useSaveContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: ContentKey; data: unknown }) =>
      saveContent(key, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contentKeys.admin() }),
  });
}

/** Generic save/delete hooks for the three content tables. */
function useCrud<I>(
  key: readonly unknown[],
  create: (body: I) => Promise<unknown>,
  update: (id: string, body: I) => Promise<unknown>,
  remove: (id: string) => Promise<void>,
) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: I }) =>
      id ? update(id, body) : create(body),
    onSuccess: invalidate,
  });
  const del = useMutation({ mutationFn: remove, onSuccess: invalidate });
  return { save, remove: del };
}

export function useSocialPosts() {
  return useQuery({
    queryKey: contentKeys.socialPosts(),
    queryFn: ({ signal }) => listSocialPosts(signal),
  });
}
export const useSocialPostMutations = () =>
  useCrud<SocialPostInput>(
    contentKeys.socialPosts(),
    createSocialPost,
    updateSocialPost,
    deleteSocialPost,
  );

export function usePages() {
  return useQuery({
    queryKey: contentKeys.pages(),
    queryFn: ({ signal }) => listPages(signal),
  });
}
export function usePage(id: string | null) {
  return useQuery({
    queryKey: contentKeys.page(id ?? ""),
    queryFn: ({ signal }) => getPage(id ?? "", signal),
    enabled: Boolean(id),
  });
}
export const usePageMutations = () =>
  useCrud<PageInput>(contentKeys.pages(), createPage, updatePage, deletePage);

export function useFaq() {
  return useQuery({
    queryKey: contentKeys.faq(),
    queryFn: ({ signal }) => listFaq(signal),
  });
}
export const useFaqMutations = () =>
  useCrud<FaqInput>(contentKeys.faq(), createFaq, updateFaq, deleteFaq);
