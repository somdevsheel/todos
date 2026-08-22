import { useColorScheme } from "react-native";

/**
 * Same tokens as apps/web/src/app/globals.css's `@theme` block (light +
 * the `prefers-color-scheme: dark` override), for visual consistency
 * between the two clients. `useColorScheme()` is a component-scope hook —
 * unlike the old flat `colors` export this replaces, a static module-level
 * object can never react to the device's setting changing at runtime, so
 * every consumer now calls `useThemeColors()` inside its component body
 * instead of importing a constant.
 */
const light = {
  surface: "#ffffff",
  surfaceSubtle: "#f7f7f8",
  border: "#e5e5e8",
  ink: "#17171a",
  inkMuted: "#6b6b74",
  accent: "#2f5d50",
  accentStrong: "#234840",
  accentSoft: "#e7efec",
  danger: "#b3261e",
  warning: "#9a6700",
  success: "#1e6b45",
  white: "#ffffff",
};

const dark = {
  surface: "#16171a",
  surfaceSubtle: "#1d1e22",
  border: "#2c2d32",
  ink: "#f2f2f3",
  inkMuted: "#9b9ba3",
  accent: "#6fbfa8",
  accentStrong: "#8fd3bf",
  accentSoft: "#1d2b27",
  // web doesn't override these three in its dark media query either —
  // same values in both modes, not an oversight.
  danger: "#b3261e",
  warning: "#9a6700",
  success: "#1e6b45",
  white: "#ffffff",
};

export type ThemeColors = typeof light;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

/** Matches web's rounded-md(6)/rounded-lg(8)/rounded-xl(12)/rounded-full conventions — see Button.tsx/Card.tsx there. */
export const radius = { sm: 6, md: 8, lg: 12, full: 9999 };
