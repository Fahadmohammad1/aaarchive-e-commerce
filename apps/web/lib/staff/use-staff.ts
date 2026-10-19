"use client";

import type {
  StaffCreateInput,
  StaffUpdateInput,
} from "@aaarchive/shared/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStaff, listStaff, updateStaff } from "./staff-api";
import { staffKeys } from "./staff-keys";

export function useStaff() {
  return useQuery({
    queryKey: staffKeys.all,
    queryFn: ({ signal }) => listStaff(signal),
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StaffCreateInput) => createStaff(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: StaffUpdateInput }) =>
      updateStaff(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
