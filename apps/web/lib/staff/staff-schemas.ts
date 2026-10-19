import { z } from "zod";

export const staffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  role: z.enum(["OWNER", "STAFF"]),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;
