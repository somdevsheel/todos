/**
 * Same light-mode palette as apps/web/src/app/globals.css's `:root` block,
 * for visual consistency between the two clients. No dark-mode variant yet
 * (the web app switches on `prefers-color-scheme`; RN's equivalent would
 * be `useColorScheme()` wired through every screen) — known simplification.
 */
export const colors = {
  surface: "#ffffff",
  surfaceSubtle: "#f7f7f8",
  border: "#e5e5e8",
  ink: "#17171a",
  inkMuted: "#6b6b74",
  accent: "#2f5d50",
  accentStrong: "#234840",
  accentSoft: "#e7efec",
  danger: "#b3261e",
  white: "#ffffff",
};
