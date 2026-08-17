const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Every email template interpolates user-controlled strings (a profile's
 * firstName/lastName, an organization's name) directly into a raw HTML
 * string — unlike React, there's no framework-level auto-escaping here.
 * Some of those fields land in a *third party's* inbox (the invitee reading
 * who invited them), so an unescaped value is a real HTML-injection vector,
 * not just a self-XSS one. Escape at the point of interpolation, not at
 * the source — these fields are legitimately unescaped everywhere else
 * (the DB, JSON API responses, React's own auto-escaping on the web app).
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
