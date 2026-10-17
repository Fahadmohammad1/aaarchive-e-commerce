import { Prisma } from "../../generated/prisma/client.js";

/** True for a unique-constraint violation (Prisma P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** True for a foreign-key violation (Prisma P2003), e.g. a Restrict delete. */
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

/** True when the row to update/delete does not exist (Prisma P2025). */
export function isNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
