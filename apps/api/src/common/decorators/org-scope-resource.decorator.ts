import { SetMetadata } from "@nestjs/common";

export const ORG_SCOPE_RESOURCE_KEY = "orgScopeResource";

export interface OrgScopeResourceMetadata {
  /** Name of the Prisma delegate to check, e.g. "department", "team", "user". */
  model: "department" | "team" | "user" | "task" | "file" | "event" | "reminder";
  /** Route param holding the resource id. Defaults to "id". */
  paramName?: string;
}

/**
 * Marks a `:id`-style route as needing organization-scope verification.
 * OrgScopeGuard loads only `{organizationId}` for the resource and denies
 * with 403 if it doesn't match the caller's organization — applied in
 * addition to (never instead of) filtering every collection query by
 * organizationId at the service layer.
 */
export const OrgScopeResource = (metadata: OrgScopeResourceMetadata) => SetMetadata(ORG_SCOPE_RESOURCE_KEY, metadata);
