import type {
  StaffCreateInput,
  StaffUpdateInput,
} from "@aaarchive/shared/auth";
import { z } from "zod";
import { api } from "@/lib/api/api-client";
import { staffMemberSchema } from "./staff-schemas";

export const listStaff = (signal?: AbortSignal) =>
  api.get("/admin/staff", {
    schema: z.object({ data: z.array(staffMemberSchema) }),
    signal,
  });
export const createStaff = (body: StaffCreateInput) =>
  api.post("/admin/staff", { body, schema: staffMemberSchema });
export const updateStaff = (id: string, body: StaffUpdateInput) =>
  api.patch(`/admin/staff/${encodeURIComponent(id)}`, {
    body,
    schema: staffMemberSchema,
  });
