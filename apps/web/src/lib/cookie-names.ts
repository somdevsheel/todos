// Plain constants (no "next/headers" import) so both Route Handlers/Server
// Components (via api-client.ts) AND edge middleware.ts can share the same
// cookie names without middleware pulling in a Node-only API.
export const ACCESS_TOKEN_COOKIE = "arutech_access_token";
export const REFRESH_TOKEN_COOKIE = "arutech_refresh_token";
