# Android App

**Status: placeholder only, verified.** `apps/mobile` is an Expo project that boots and renders a single static screen confirming the app builds and is pointed at the same backend the web app uses — confirmed with a real `expo export --platform android`, not just written and assumed to work (Metro reports it bundling `apps/mobile/index.ts` into a working `.hbc` bundle). This is the Phase 6 plan for everything beyond that.

## What exists today

- Expo SDK 57 / React Native **0.86.2** (exact-pinned, not a caret range — see the monorepo note below) / React 19.
- `App.tsx` — one screen, no navigation library, no auth, no network calls.
- `app.json` — app name, Android package id (`com.arutechconsultancy.workspace`), no icon/splash assets yet (none were generated — referencing image paths that don't exist would break the build, so none are referenced).
- `metro.config.js` — **required** in this pnpm monorepo. Without it, Metro's default project-root detection gets confused by the `pnpm-workspace.yaml` at the repo root and fails to resolve the app's own entry file (verified by actually booting the dev server before this file existed — it 404'd trying to resolve `./index` from the repo root instead of `apps/mobile`). This config explicitly watches the monorepo root (for hoisted/workspace deps) while keeping `apps/mobile` as the project root.
- `react-native` is exact-pinned to `0.86.2`, not a caret range: Expo SDK releases validate against one specific React Native patch version, and a newer RN patch (`0.87.0`, what a plain `^0.87.0` range resolved to) broke Metro bundling with a "Cannot find module .../react-native/rn-get-polyfills" error — an upstream Expo/RN internal-path mismatch, not a version that happened to be untested. `pnpm exec expo install react-native --check` is the authoritative way to find the version Expo actually expects; don't guess a semver range by hand.

## Plan

- **Navigation**: introduce a router (React Navigation or Expo Router) only once there are real screens to route between — not scaffolded speculatively.
- **Auth**: same NestJS endpoints as the web app (`/auth/login`, `/auth/refresh`, etc.), but tokens stored in secure device storage (`expo-secure-store` or equivalent) instead of httpOnly cookies — this is exactly why the API returns tokens in the JSON body rather than as a browser cookie (see [AUTHENTICATION.md](./AUTHENTICATION.md)).
- **FCM push**: `expo-notifications` (or `@react-native-firebase/messaging` for a bare/dev-client build, depending on which is chosen when this phase starts) registering against the `POST /user-devices` endpoint that already exists and works today.
- **Deep linking**: `app.json`'s `scheme: "arutechworkspace"` is already reserved. Notification payloads carry `{type, entityId}` (see [FCM.md](./FCM.md)); the app resolves that to a route:
  - Task → `/tasks/{taskId}`
  - Chat → `/chat/{conversationId}`
  - Event → `/calendar/events/{eventId}`
- **Device registration / logout-all-devices**: the backend already supports registering multiple devices per user and deactivating one on logout (`DELETE /user-devices/:id`) — the mobile client just needs to call it.
- **No iOS app** — not in scope, per the product spec.

## Running the placeholder

```bash
pnpm --filter @arutech/mobile start
```
Scan the QR with Expo Go, or press `a` for an Android emulator/device.
