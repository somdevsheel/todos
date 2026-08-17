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
  it via the existing `POST /user-devices`. This **will fail** without a
  real Firebase project (`google-services.json` referenced in `app.json`)
  — none exists yet, see FCM.md — and is written to fail closed (logged,
  not thrown), the same "unconfigured is a supported state" philosophy
  `FcmService` already uses server-side.
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
