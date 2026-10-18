import { type AdminMessages, enAdmin } from "./en-admin";

/** Dashboard dictionary. Import only from /admin code, never the storefront. */
export function getAdminMessages(): AdminMessages {
  return enAdmin;
}
