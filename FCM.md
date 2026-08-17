# Firebase Cloud Messaging (FCM)

**Status: the code is done; the infrastructure is not.** No Firebase project
has been created or connected — that step explicitly requires a human with
account access and can't be provisioned from inside this repo (see below).
Everything this repo *can* build without that — the send pipeline, the
device-token lifecycle, and user-editable preferences — is real.

## What exists today

- `UserDevice` table (`userId, deviceToken, platform, deviceName, appVersion, lastSeenAt, isActive`) with real endpoints: `POST /user-devices` (register/refresh a token), `GET /user-devices` (list own), `DELETE /user-devices/:id` (soft-deactivate). A user can already register multiple devices — the data model never assumed one user has one device.
- `FcmModule` (`apps/api/src/fcm/`) wraps `firebase-admin`. `FcmService.onModuleInit()` initializes the SDK from `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` **only if all three are set** — otherwise it logs a warning once and every send becomes a no-op. This is the actual state of every environment this code has run in so far: local dev's `.env` leaves these blank, same as production would until a real Firebase project exists.
- `NotificationsService.create()`/`createMany()` fan out to `FcmService.sendToUser()` after every successful DB write — every current and future notification producer (tasks, events, reminders) gets push for free, with zero changes to those services. Never throws — a push failure can't fail the business operation that triggered it.
- Invalid/expired token cleanup: `sendToUser()` inspects each `sendEachForMulticast()` response, and on `messaging/registration-token-not-registered` / `messaging/invalid-registration-token`, calls `UserDevicesService.deactivateByToken()` — a dead token stops being retried forever, automatically.
- Payloads carry a deep-link target: the FCM `data` field always includes `{type, ...notification.data}` (e.g. `{type: "TASK_ASSIGNED", taskId: "..."}`) — see [ANDROID.md](./ANDROID.md) for how the Android app will eventually resolve that into a screen.
- Idempotency: pushes aren't retried from a queue in this phase (they're sent synchronously, once, right after the DB write) — the de-duplication concern that matters, the reminder worker's, is already solved at the schema/claim level (see the unique constraint on `Reminder` and `RemindersService.claim()` in [DATABASE.md](./DATABASE.md)/[NOTIFICATIONS.md](./NOTIFICATIONS.md)).
- `NotificationPreference` is real and user-editable: `GET`/`PATCH /notifications/preferences`, a Settings-page UI. **Only the PUSH channel is actually enforced** — see NOTIFICATIONS.md's "Preference enforcement scope" for why IN_APP and EMAIL toggles aren't offered.

## What's still missing

1. **The actual Firebase project for Arutech Consultancy Services LLP** — requires a human with account access; not something this repo can provision. Until real `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` values exist, `FcmService` runs disabled everywhere, including this repo's own dev environment. **This means no live push send has been verified end-to-end** — only the code paths around it (unit-tested with `firebase-admin` mocked, and a live boot confirming the disabled state doesn't crash anything).
2. A real device to register a token from — `apps/mobile` is still a Phase 1 placeholder screen (real FCM registration UI is Phase 6), so `UserDevice` rows today can only come from directly calling `POST /user-devices`, not from an actual app.
3. `env.schema.ts` now requires the three `FCM_*` vars in production (`superRefine`, same treatment as the JWT secrets) — deploying to production without a real Firebase project will fail loudly at boot, by design.

Browser push is explicitly out of scope as an FCM substitute — the dedicated Android app is the FCM-push client, per the product spec.
