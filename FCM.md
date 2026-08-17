# Firebase Cloud Messaging (FCM)

**Status: not implemented.** No Firebase project has been created or connected. This is the Phase 4 plan.

## What exists today

- `UserDevice` table (`userId, deviceToken, platform, deviceName, appVersion, lastSeenAt, isActive`) with real endpoints: `POST /user-devices` (register/refresh a token), `GET /user-devices` (list own), `DELETE /user-devices/:id` (soft-deactivate). A user can already register multiple devices — the data model never assumed one user has one device.
- `.env.example` reserves `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, documented as unused until this phase.
- `env.schema.ts` validates those three as optional today; they'll move to required-in-production once this phase lands.

## Plan

1. Create the Firebase project for Arutech Consultancy Services LLP (requires a human with account access — not something this repo can provision).
2. Add a `FcmModule` wrapping `firebase-admin`, initialized from the three env vars above (service-account credentials — never committed, never logged).
3. `NotificationsService.create()` (once it exists — see [NOTIFICATIONS.md](./NOTIFICATIONS.md)) fans out to every `isActive` `UserDevice` for the target user, respecting `NotificationPreference`.
4. Invalid/expired token cleanup: on an FCM "unregistered" error response, mark the corresponding `UserDevice.isActive = false` rather than retrying it forever.
5. Payloads carry a deep-link target (`{type: "TASK_ASSIGNED", entityId: "..."}`) — see [ANDROID.md](./ANDROID.md) for how the Android app resolves that into a screen.
6. Idempotency: notifications are never sent from a retryable job without a de-duplication key (this is already true for the reminder use case at the schema level — see the unique constraint on `Reminder` in [DATABASE.md](./DATABASE.md)).

Browser push is explicitly out of scope as an FCM substitute — the dedicated Android app is the FCM-push client, per the product spec.
