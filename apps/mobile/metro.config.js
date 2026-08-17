// Metro config for running Expo inside a pnpm monorepo. Without this,
// Metro's default project-root detection gets confused by the
// pnpm-workspace.yaml at the repo root and tries to resolve the app's
// entry file relative to the monorepo root instead of apps/mobile —
// verified by actually booting the dev server and requesting the bundle
// before this file existed (it 404'd with "Unable to resolve module
// ./index"). Standard Expo-in-a-monorepo fix: watch the monorepo root
// (so hoisted/workspace dependencies resolve) while keeping this
// package's own directory as the project root.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
