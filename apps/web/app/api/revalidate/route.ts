import { timingSafeEqual } from "node:crypto";
import {
  REVALIDATE_MAX_TAGS,
  REVALIDATE_SECRET_HEADER,
} from "@aaarchive/shared/cache-tags";
import { revalidateTag } from "next/cache";
import { z } from "zod";

// The only route handler (docs/architecture.md §3.1): the API calls it after
// an admin write so cached storefront pages pick up the change. Guarded by
// REVALIDATE_SECRET; nothing else here touches data.

const bodySchema = z.strictObject({
  tags: z.array(z.string().min(1).max(256)).min(1).max(REVALIDATE_MAX_TAGS),
});

function secretMatches(sent: string | null): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !sent) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get(REVALIDATE_SECRET_HEADER))) {
    return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) {
    return Response.json({ code: "VALIDATION_ERROR" }, { status: 400 });
  }
  // "max": visitors get the cached page while it rebuilds in the background.
  for (const tag of parsed.data.tags) revalidateTag(tag, "max");
  return new Response(null, { status: 204 });
}
