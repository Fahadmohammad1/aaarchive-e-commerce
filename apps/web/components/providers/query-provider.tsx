"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type * as React from "react";
import { ApiError } from "@/lib/api/api-error";

// Global TanStack Query defaults (docs/rules.md §4.2).
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) => {
          // 4xx is the caller's problem — retrying will not help.
          if (
            ApiError.isApiError(error) &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** One client per browser session; a fresh one per server request. */
function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
