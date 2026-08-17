import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { CurrentUser, RoleName } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies, ApiClientError } from "./api-client";
import { hasAnyRole } from "./rbac";

/**
 * Returns the current user, or null if unauthenticated / the session is
 * invalid. Never throws for a 401. Wrapped in React's `cache()` so the
 * layout and the page it wraps share a single `/users/me` call per request
 * instead of both fetching it independently.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const accessToken = await getAccessTokenFromCookies();
  if (!accessToken) return null;

  try {
    return await apiFetch<CurrentUser>("/users/me", { accessToken });
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
});

/** Server Component guard: redirects to /login when unauthenticated. */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Server Component guard: redirects unauthorized (wrong-role) users back to the dashboard. */
export async function requireRole(roles: RoleName[]): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!hasAnyRole(user, roles)) redirect("/dashboard");
  return user;
}
