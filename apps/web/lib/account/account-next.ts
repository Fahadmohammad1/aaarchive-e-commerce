/**
 * Where to go after signing in: only our own account or checkout pages, so
 * a crafted ?next= link cannot send anyone to another site (open redirect).
 * Mirrors safeCustomerNext() in the API.
 */
export function safeAccountNext(next: string | null | undefined): string {
  if (
    next &&
    /^\/(account|checkout)(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(
      next,
    ) &&
    !next.startsWith("/account/login")
  ) {
    return next;
  }
  return "/account";
}
