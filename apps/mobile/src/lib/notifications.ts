import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router } from "expo-router";
import { apiFetch } from "./api-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers this device for push against the same `POST /user-devices`
 * endpoint Phase 4 already built and tested. Requires a real Firebase
 * project wired into app.json (a `google-services.json`) to actually
 * obtain a device token — none exists yet (see FCM.md), so this fails
 * closed: logged, never thrown, the same "unconfigured is a supported,
 * non-crashing state" philosophy `FcmService` already uses server-side.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) return; // push tokens aren't meaningful on a simulator/emulator without Play services

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return;

  try {
    // getDevicePushTokenAsync(), not getExpoPushTokenAsync() — the backend
    // (FcmService) calls firebase-admin's messaging API directly with raw
    // FCM registration tokens, not Expo's own push relay format.
    const { data: deviceToken } = await Notifications.getDevicePushTokenAsync();
    await apiFetch("/user-devices", {
      method: "POST",
      body: JSON.stringify({
        deviceToken,
        platform: "ANDROID",
        deviceName: Device.deviceName ?? undefined,
        appVersion: Constants.expoConfig?.version,
      }),
    });
  } catch (error) {
    console.warn("Push registration skipped (expected without a real Firebase project — see FCM.md):", error);
  }
}

export interface NotificationDeepLinkData {
  type?: string;
  taskId?: string;
  eventId?: string;
  conversationId?: string;
}

/** Resolves the `{type, ...}` payload FcmService sends (apps/api/src/fcm/fcm.service.ts) into an Expo Router path. */
export function resolveNotificationRoute(data: NotificationDeepLinkData): `/${string}` | null {
  if (data.taskId) return `/tasks/${data.taskId}`;
  if (data.eventId) return `/calendar/${data.eventId}`;
  if (data.conversationId) return `/chat/${data.conversationId}`;
  return null;
}

export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as NotificationDeepLinkData;
  const path = resolveNotificationRoute(data);
  if (path) router.push(path);
}
