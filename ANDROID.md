# Android App

**Status: real screens across auth, tasks, calendar, and chat — verified via
`tsc --noEmit`, ESLint, and a real `expo export --platform android` bundle
build. Not verified: an actual running app.** There is no Android
emulator or physical device available in this environment (`adb devices`
finds nothing, no AVD images installed), so nothing here has been visually
confirmed on-screen, interacted with by touch, or checked for a live
login/CRUD/push round-trip. That's a materially different (weaker) claim
than "done" — the code compiles, type-checks, lints clean, and Metro
successfully bundles the full dependency graph into a working `.hbc`, which
is real signal, but it isn't the same as watching it run.

## What exists today

- Expo Router (file-based routing, `apps/mobile/src/app/`), auth-gated via
  `Stack.Protected` in the root layout — `(auth)/login` when signed out,
  `(tabs)/*` when signed in. Deep linking comes from this for free: the
  `arutechworkspace://` scheme (already reserved) plus Expo Router's own
  path-based linking.
- **Auth**: `lib/auth-context.tsx` + `lib/api-client.ts`. Tokens go to
  `expo-secure-store`, not a cookie — exactly what `AuthTokenPair`'s
  docstring in `packages/shared-types/src/user.ts` already anticipated
  ("a future mobile client instead stores these in secure device
  storage"). One shared in-flight refresh-and-retry on a 401 (mirrors the
  *policy* of `apps/web/src/middleware.ts`'s silent refresh, implemented as
  a plain function since there's no middleware layer on mobile). `POST
  /auth/logout` is called (best-effort) before local tokens are cleared,
  same as the web app's logout button.
- **Tasks** (`(tabs)/tasks/`): list with the same named views as web
  (`mine`/`assigned`/`created`/`team`/`completed`/`overdue`), a detail
  screen (status change, assignees, subtasks, plain-text comments — no
  @mention picker yet, see below), and a create screen. List, not the web
  app's Kanban board — touch drag-and-drop wasn't worth the extra risk
  given no device to verify it against.
- **Calendar** (`(tabs)/calendar/`): agenda-only (a day-grouped scrollable
  list over a rolling 30-day window from the same `GET /events?from=&to=`
  range endpoint), event detail with RSVP, and a create screen. No
  month/week/day grid views — deliberate mobile simplification, not a cut
  corner (list-first calendar UX is the norm on phones). The create
  screen's start/end fields are plain text (`YYYY-MM-DD HH:MM`), not a
  native date-time picker widget — pulling in
  `@react-native-community/datetimepicker` with no way to visually verify
  it renders correctly wasn't a good trade in this environment.
- **Chat** (`(tabs)/chat/`): conversation list (live-patched off the same
  socket, same pattern as `apps/web/src/components/chat/
  ConversationListLive.tsx`), a real-time conversation view (messages,
  typing indicator, read-on-focus), and starting a new **DIRECT**
  conversation via a simple employee search. **No GROUP conversation
  creation on mobile yet** — a real gap, not just "smaller UI"; there's no
  way to start a named group chat from the phone today. Reuses the exact
  same WebSocket ticket mechanism as web (`POST /auth/ws-ticket` +
  `socket.io-client`) — see AUTHENTICATION.md — actually simpler here since
  the app already talks to the API directly for everything, no BFF hop
  needed to route the ticket-mint call through.
- **FCM**: `lib/notifications.ts` requests permission and calls
  `Notifications.getDevicePushTokenAsync()` (the raw FCM registration
  token — not `getExpoPushTokenAsync()`'s Expo-relay format, since
  `FcmService` server-side calls `firebase-admin` directly), then registers
  it via the existing `POST /user-devices`. Written to fail closed (logged,
  not thrown) if it can't get a token — the same "unconfigured is a
  supported state" philosophy `FcmService` already uses server-side. As of
  the "Real device build" section below, a real Firebase project *does*
  exist (`arutech-workspace`, same one FCM.md's server-side setup uses) —
  this path is no longer expected to fail closed on a real build, though
  that's not yet confirmed on an actual device (see that section's status).
  `apps/mobile/google-services.json` (the Android app's registration in
  that Firebase project) is **gitignored**, not committed — same
  every-credential-cautious treatment as everything else in this repo, even
  though its `api_key` is technically safe to ship inside a compiled APK by
  design. Get a fresh copy from Firebase Console → Project Settings → Your
  apps → the Android app (package `com.arutechconsultancy.workspace`) →
  download `google-services.json` → place at `apps/mobile/google-services.json`.
- A notification-response listener resolves `{type, taskId|eventId|
  conversationId}` (the exact payload `FcmService` sends) into an Expo
  Router path.
- `react-native` stays exact-pinned (`0.86.2`); new dependencies were
  installed via `npx expo install <pkg>`, never a hand-picked semver
  range — see the Phase 1 lesson documented below.
- Same visual palette as the web app (`lib/theme.ts` mirrors
  `apps/web/src/app/globals.css`'s light-mode `:root` values) — no dark
  mode yet on mobile (the web app switches on `prefers-color-scheme`; RN's
  equivalent, `useColorScheme()`, isn't wired through every screen).

## Known gaps, stated plainly

- No GROUP conversation creation (chat).
- No month/week/day calendar views, no native date-time picker.
- No task Kanban board, no @mention picker in task comments or messages
  (plain text only on mobile).
- No push notification has ever actually been delivered to a device — see
  FCM.md's parallel caveat.
- No app icon/splash assets — `app.json` intentionally doesn't reference
  image paths that don't exist (same discipline the Phase 1 placeholder
  already followed).
- No screenshots, no video, no confirmation the UI actually looks right on
  a real screen size. This is real risk, not hedging for its own sake.

## Lessons from Phase 1 that still apply

- `metro.config.js` is required in this pnpm monorepo — without it,
  Metro's default project-root detection gets confused by the
  `pnpm-workspace.yaml` at the repo root.
- `react-native` must be exact-pinned to the version `expo install --check`
  reports, not a caret range — a newer patch broke Metro bundling with an
  upstream Expo/RN internal-path mismatch when this was first hit.
- `src/app` (not a top-level `app/`) is auto-detected by Expo Router/Metro
  (`@expo/metro-config`'s `getRouterDirectory()` checks `src/app` first) —
  confirmed directly against the installed package source, and by
  `expo export`'s own log line ("Using src/app as the root directory for
  Expo Router").

## Real device build (EAS Build) — in progress

Unlike everything above (verified only via `tsc`/lint/`expo export`, no
device), this is an attempt at an actual installable APK via Expo's cloud
build service, tied to the same real `arutech-workspace` Firebase project
already wired server-side (see FCM.md) — plus the app's own Android
registration in that project (`apps/mobile/google-services.json`,
`app.json`'s `android.googleServicesFile`), a separate step from the
server-side Admin SDK credentials.

**Real bug found and fixed**: the first `eas build --platform android
--profile preview` attempt failed at the "Bundle JavaScript" phase with no
further detail in the CLI. Root cause: identical to a bug hit the same
session on Vercel (see DEPLOYMENT.md) — `@arutech/shared-types` compiles to
`dist/` (gitignored, never committed; `main`/`types` in its `package.json`
point there), and EAS Build's clean environment has no reason to know it
needs building before Metro tries to bundle the mobile app, which imports
from it throughout. Fixed with an `eas-build-post-install` script in
`apps/mobile/package.json` — EAS Build auto-runs this hook (if present)
after `pnpm install`, before the actual build/bundle steps:
```json
"eas-build-post-install": "cd ../.. && pnpm --filter @arutech/shared-types build"
```

## Running it

```bash
pnpm --filter @arutech/mobile start
```
Scan the QR with Expo Go, or press `a` for an Android emulator/device —
neither was available to verify this phase's work in this environment; see
the status note above.

```bash
pnpm --filter @arutech/mobile typecheck   # tsc --noEmit
pnpm --filter @arutech/mobile lint        # eslint . --fix
npx expo export --platform android        # real Metro bundle, from apps/mobile
```
