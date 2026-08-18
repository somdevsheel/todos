// @ts-check
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// No prettier — this monorepo doesn't use it anywhere (web/mobile's own
// eslint configs don't either), and introducing formatting rules now would
// produce a wall of unrelated reformatting diffs across the whole existing
// codebase rather than real lint findings. This is a real gap that was
// simply never set up before Phase 8 — every prior phase's "pnpm build/test"
// verification never actually exercised `pnpm lint`, which is what let it
// go unnoticed until CI (ci.yml) started calling it for real.
export default tseslint.config(
  { ignores: ["eslint.config.mjs", "dist/**", "coverage/**", "node_modules/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NestJS's decorator-heavy style (constructor-injected params,
      // guard/interceptor classes referenced only via DI) trips the
      // no-unused-vars/no-empty-object-type defaults in ways that don't
      // reflect real dead code — same reasoning apps/web and apps/mobile's
      // configs already apply to their own framework-specific false
      // positives.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
