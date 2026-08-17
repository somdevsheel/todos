import type { Config } from "tailwindcss";

// Tailwind v4 is CSS-first (see src/app/globals.css's `@theme` block for
// design tokens) — this file exists purely to give the v4 postcss plugin
// explicit content globs in a monorepo, where its default heuristic
// content-detection is less reliable.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/shared-types/src/**/*.{ts,tsx}"],
};

export default config;
