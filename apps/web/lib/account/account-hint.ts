// "aar_csession=1" is set and cleared by the API next to the customer refresh
// cookie (apps/api account-cookies.ts). It holds no secret and grants
// nothing: it only spares guests a refresh request that would fail.
const HINT = "aar_csession=1";

export function hasAccountHint(): boolean {
  return document.cookie.split("; ").includes(HINT);
}
