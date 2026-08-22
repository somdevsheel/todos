# Android App

**Status: real screens across auth, tasks, calendar, chat, notifications,
and org/admin management (departments, teams, employees, invitations,
announcements, audit log, permission matrix) — plus a real dark mode
matching the web app's palette exactly. Verified via `tsc --noEmit`,
ESLint, and a real `expo export --platform android` bundle build. Not
verified: an actual running app.** There is no Android emulator or
physical device available in this environment (`adb devices` finds
nothing, no AVD images installed), so nothing here has been visually
confirmed on-screen, interacted with by touch, or checked for a live
login/CRUD/push round-trip. That's a materially different (weaker) claim
than "done" — the code compiles, type-checks, lints clean, and Metro
successfully bundles the full dependency graph (1477 modules as of the
admin-screens pass) into a working `.hbc`, which is real signal, but it
isn't the same as watching it run.

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
  (`mine`/`assigned`/`created`/`team`/`completed`/`overdue`), a List/Board
  layout toggle (Board = a real Kanban view, see "Closed gaps" below), a
  detail screen (status change, assignees, subtasks, comments with a real
  @mention picker), and a create screen (title, description, priority, and
  a native date-time picker for the due date).
- **Calendar** (`(tabs)/calendar/`): agenda, month, week, and day views,
  all driven by one parent screen (view toggle + prev/next/today
  navigation), event detail with RSVP, and a create screen using the same
  native date-time picker as tasks. See "Closed gaps" below for how the
  four views are actually built.
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
- Same visual palette as the web app, **light and dark** — `lib/theme.ts`
  now exports a `useThemeColors()` hook (not a static object) mirroring
  both halves of `apps/web/src/app/globals.css`'s `@theme`/
  `prefers-color-scheme: dark` blocks exactly, switching on RN's
  `useColorScheme()`. See "Closed gaps" below for why this had to be a
  hook, not a constant, and what changed to support it.
- **Notifications** (`app/notifications.tsx`): reached via a bell icon in
  the tab header, not a 6th tab — matches web, which only ever puts
  Notifications behind a Topbar icon too (see `NAV_ITEMS`' `showInBottomNav`
  flags in shared-types). List, mark-one-read-and-navigate,
  mark-all-read.
- **Org/admin management** (`(tabs)/settings/`, now a nested stack instead
  of one flat screen): Departments, Teams (list + a member-management
  detail screen), Employees (list + profile edit/status actions/role
  editor), Invite an employee, Announcements, and — SUPER_ADMIN only —
  the full Audit log (filterable, paginated) and the Roles & permissions
  matrix, carrying the same "doesn't gate anything yet" caveat web's
  version states. Every screen's role gate matches the API's actual guard,
  not just which tile is visible.

## Known gaps, stated plainly

- No push notification has ever actually been delivered to a device — see
  FCM.md's parallel caveat.
- No native picker component is installed in this app (no
  `@react-native-picker/picker`, nothing equivalent), so three mobile
  admin forms are narrower than their web counterparts specifically where
  web uses a `<select>`: creating/editing a **team** can't assign a
  `departmentId` from mobile, editing an **employee**'s profile can't
  reassign their department either, and the **invite** form doesn't offer
  a department picker. All three remain real, working actions otherwise
  (name/description/roles/etc. all save correctly) — this is a scoped,
  named gap, not a silent omission, and the fix is "install a picker
  library and wire one more field," not an architectural change.

## Closed gaps

- **Tapping a row (chat conversation, task, event, Kanban card, employee)
  did nothing** — a real bug, found from a user report ("chat doesn't
  open when I tap an existing conversation"), not caught by `tsc`/ESLint/
  `expo export`, none of which check whether a tap actually does anything.
  Root cause: `<Link href={...} asChild><Card>...</Card></Link>` — Expo
  Router's `asChild` clones its *immediate* child and merges an `onPress`
  handler onto it (confirmed by reading `expo-router`'s own
  `BaseExpoRouterLink`/`Slot` source, which wraps `@radix-ui/react-slot`).
  `Card` just renders a plain `View`, and a plain RN `View` has no
  built-in touch handling — only `Pressable`/`Touchable*` do — so the
  injected `onPress` landed on an element that silently ignores it. This
  is why it type-checked and bundled fine: nothing about it is a type or
  bundling error, only a runtime one. Fixed everywhere this pattern
  appeared (`chat/index.tsx`, `TaskRow.tsx`, `EventRow.tsx`,
  `TaskKanbanCard.tsx`, `settings/employees/index.tsx`) by inserting a
  `Pressable` between `Link` and `Card` — `<Link asChild><Pressable><Card>
  ...</Card></Pressable></Link>` — matching the pattern already used
  correctly elsewhere in this app (every icon-button header action, and
  `settings/index.tsx`/`settings/teams/index.tsx`, which is how the bug
  was scoped: grepped every `<Link ... asChild>` in the app and checked
  each one's immediate child by hand, not fixed by pattern-matching alone).
  Verified via `tsc --noEmit`, ESLint, and a real `expo export` bundle —
  same honest caveat as everywhere else in this doc: not confirmed by an
  actual tap on an actual device, since none is available here.

- **A white/light gap below short screens in dark mode** — a second real
  bug, found from a user-supplied screenshot (the Dashboard and an Event
  detail screen, both dark-themed everywhere except a plain light band
  between the content and the bottom tab bar). Root cause: 12 screens'
  top-level `<ScrollView contentContainerStyle={styles.content}>` set
  `backgroundColor` only on `contentContainerStyle` — the inner content
  wrapper, sized to the *content's* height — never on the `ScrollView`
  itself, which is what actually fills the *screen's* height. When a
  screen's content is shorter than the viewport (the common case — an
  empty/near-empty dashboard, a short event), the leftover space belongs
  to the `ScrollView`'s own box, which had no background of its own and so
  fell through to the navigator's default (light) scene color — invisible
  in light mode by coincidence (both landed near-white), glaringly visible
  once dark mode existed. Fixed at both levels: each affected screen now
  also sets `style={{flex:1, backgroundColor: colors.surfaceSubtle}}` on
  the `ScrollView` itself (the real fix — found by grepping every
  `<ScrollView contentContainerStyle` in the app and checking whether its
  *own* `style` prop, not just its content container, carried a
  background), and every `Stack`/`Tabs` navigator now also sets
  `contentStyle`/`sceneStyle` to the theme's `surfaceSubtle` as a safety
  net for whatever screen gets added next and makes the same mistake.
  Screens already wrapped in a backgrounded `KeyboardAvoidingView` or
  outer `View` (`login.tsx`, `tasks/new.tsx`, `tasks/[id].tsx`,
  `calendar/new.tsx`, `tasks/index.tsx`'s Kanban scroll) didn't have this
  bug — confirmed by reading each one, not assumed from the pattern name
  alone. Verified via `tsc --noEmit`, ESLint, and a real `expo export`
  bundle; not yet confirmed by looking at an actual device, same caveat
  as the rest of this section.

- **Dark mode** — `lib/theme.ts`'s flat `colors` export became a
  `useThemeColors()` hook (`light`/`dark` objects switched on
  `useColorScheme()`), because a module-scope constant evaluated once at
  import time structurally cannot react to the device's appearance
  changing at runtime — only a hook subscribing through React's render
  cycle can. That forced a real, mechanical change across every one of the
  ~30 files that imported the old constant: each now calls
  `const colors = useThemeColors()` inside its component body and builds
  its `StyleSheet.create(...)` inside `useMemo(() => ..., [colors])`
  rather than at module scope (a plain `StyleSheet.create` outside any
  component can only ever see whatever palette was active when the module
  first loaded). Two real wrinkles found while doing this: `TaskRow.tsx`
  exported a module-scope `STATUS_COLORS` constant computed from `colors`
  at import time — became a `getStatusColors(colors)` function instead;
  and `--color-warning`/`--color-success` existed on web's palette but
  were missing from mobile's — added to both light and dark. Verified via
  `tsc --noEmit` (clean — nothing depends on the old `colors` export
  anymore, confirmed by grep before and after) and a real
  `expo export --platform android` bundle.
- **Notifications screen and org/admin management** — the day-to-day gap
  (no in-app notification list, despite push registration already being
  wired) and the bigger one (no Teams/Employees/Admin equivalent on mobile
  at all) were closed together, each screen calling the API directly with
  the exact endpoints/DTOs/role-gates web's equivalent page uses — not
  reinvented. `settings.tsx` (one flat screen) became `settings/` (a
  nested `Stack`, matching the existing `tasks/`/`calendar/`/`chat/`
  pattern), fanning out to the screens listed above. Reused
  `UserSearchPicker` for "add a team member" even though its own docstring
  frames it around starting a direct chat — the component's actual
  behavior (search, tap a result, fire a callback) is generic; only the
  caller's callback differs. Added an `excludeUserIds` prop to it in the
  process (it didn't have one; `MultiUserSearchPicker` already did) so
  someone already on a team doesn't show up in their own team's
  "add a member" search.

- **GROUP conversation creation** — `chat/new.tsx` now has a DIRECT/GROUP
  toggle; GROUP mode uses a new `MultiUserSearchPicker` (mobile's
  equivalent of web's `AssigneePicker`, kept as a separate component from
  the existing single-select `UserSearchPicker` specifically so its
  tap-and-navigate DIRECT flow stayed unregressed).
- **@mention picker in task comments and chat messages** — both composers
  now use that same `MultiUserSearchPicker`, wiring real `mentionedUserIds`
  into `POST /tasks/:id/comments` and `POST /conversations/:id/messages`
  instead of the hardcoded `[]` both send previously. The chat composer's
  layout changed from a single horizontal row to a stacked
  picker-above-input layout — the picker's own result list needs vertical
  room a horizontal row can't give it.
- **Month/week/day calendar views** — `calendar/index.tsx` rewritten as a
  unified parent (view + anchor state, a view toggle, prev/next/today
  navigation) that fetches once and hands `events` down to whichever of
  four view components is active: the original agenda screen, extracted
  into its own `AgendaView`, plus new `MonthView` (a dot-indicator grid,
  not web's full event chips — a phone-width grid cell can't fit 3 legible
  titles the way a desktop one can; tap a day to jump to Day view instead,
  the standard mobile calendar pattern), `WeekView` (7 days stacked
  vertically, not side-by-side columns — doesn't fit phone width), and
  `DayView`. `apps/mobile/src/lib/calendar-dates.ts` is a deliberate
  near-identical copy of web's file of the same name (pure date math, no
  React/RN deps in the original) — not factored into shared-types, since
  that would mean touching web's already-deployed import sites for a
  refactor this pass didn't need.
- **Native date-time picker** — `@react-native-community/datetimepicker`
  (installed via `npx expo install`, not a hand-picked version, same
  discipline as every other native dependency here), wrapped in a new
  `DateTimeField` component. Android renders date and time as two separate
  modal dialogs (no combined picker like iOS), hence the component's
  `step: "idle" | "date" | "time"` state machine — replaces the plain-text
  `YYYY-MM-DD HH:MM` fields event creation shipped with before real EAS
  Build access existed to verify a native module on-device. Also used for
  a **new due-date field on task creation** (mobile had none at all before
  this — a real, smaller gap found while building this), in `mode="date"`
  (date-only, matching web's `<input type="date">` — no time-of-day
  meaning for a task due date, so the time step is skipped).
- **Task Kanban board** — `tasks/index.tsx` gained a List/Board layout
  toggle; Board renders `TaskKanban` (horizontally-scrollable status
  columns, ported grouping logic in `lib/task-kanban.ts` — same
  deliberate-duplication-not-shared-types call as `calendar-dates.ts`).
  Real finding while building this: web's own "Kanban board" isn't
  drag-and-drop either — `TaskKanbanCard.tsx` on web uses a `<select>`
  status dropdown per card, a documented product decision, not a corner
  cut. That doesn't port cleanly to Android as-is: `Alert.alert` reliably
  renders at most ~3 buttons, not `TASK_STATUSES`' 5 values, and a cramped
  narrow Kanban column is a worse place for a real status control than the
  task detail screen. So mobile's Kanban cards tap through to that
  existing, already-tested detail screen for the actual status change,
  rather than duplicating a status picker into the card — this is genuine
  parity with web's actual (non-drag-and-drop) design, not a simplified
  substitute for one.
- All of the above verified via `tsc`, ESLint, and a real
  `expo export --platform android` bundle (including the new native
  module resolving correctly into the JS bundle) — not yet confirmed by
  tapping through them on the real device build (see the "Real device
  build" section above for that status).
- No screenshots, no video, no confirmation the UI actually looks right on
  a real screen size. This is real risk, not hedging for its own sake.

## Closed: app icon, adaptive icon, splash screen, web favicon

Real logo provided (`apps/mobile/assets/source/arutech-logo.png` — the
canonical source; a 250×250 PNG, note the caveat below), not a placeholder.
Generated via Pillow (LANCZOS resampling):

- `assets/icon.png` (1024×1024, solid `#2F5D50` brand-teal background —
  matches `adaptiveIcon.backgroundColor`) — `app.config.js`'s top-level `icon`.
- `assets/adaptive-icon.png` (1024×1024, **transparent**, logo at ~55% of
  the canvas — safe-zone padded, since Android crops this into a
  circle/squircle/rounded-square per-launcher and clips content too close
  to the edge) — `android.adaptiveIcon.foregroundImage`.
- `assets/splash-icon.png` (512×512, transparent) — wired through the
  `expo-splash-screen` config plugin (installed via `npx expo install`;
  its exact config shape — `image`/`imageWidth`/`resizeMode`/
  `backgroundColor` — was read directly from the installed package's own
  `plugin/src/types.ts`, not assumed, since splash config has changed
  shape across Expo SDK versions and no local docs existed to check
  against, per this repo's `AGENTS.md`).
- `apps/web/src/app/icon.png` (256×256, transparent) — Next.js App
  Router's file-convention favicon; confirmed picked up for real via a
  production build (`○ /icon.png` in the build output), not assumed.

**Honest quality caveat**: the only source available is 250×250. Upscaled
to 1024×1024 for the app icon, some softness is visible on close
inspection — real signal, not a placeholder, but not print-quality either.
Verified via `tsc`, ESLint, a real `expo export --platform android` bundle,
a real `next build`, and a real `next test` run — not yet confirmed by
looking at the actual icon on a real device's home screen or app switcher.

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
```
eas build --platform android --profile preview
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
