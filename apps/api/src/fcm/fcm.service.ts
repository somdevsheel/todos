import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type SendResponse } from "firebase-admin/messaging";
import type { FcmConfig } from "../config/configuration";
import { UserDevicesService } from "../user-devices/user-devices.service";

export interface PushPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// FCM's own "this token is gone" error codes — see FCM.md point 4.
const DEAD_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Thin wrapper around firebase-admin. Unlike MailerService (which always
 * has a reachable target — MailHog locally, a real provider in production),
 * there is no local-dev equivalent of a push service: no Firebase project
 * exists for this app yet (see FCM.md — provisioning one requires a human
 * with account access, not something buildable from this repo). So
 * "unconfigured" has to be a supported, non-crashing state: every method
 * becomes a logged no-op when the three FCM_* env vars aren't all set,
 * which is the actual state of local dev and of every environment this
 * code has run in so far.
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly userDevicesService: UserDevicesService,
  ) {}

  onModuleInit(): void {
    const fcm = this.configService.get<FcmConfig>("fcm")!;
    if (!fcm.projectId || !fcm.clientEmail || !fcm.privateKey) {
      this.logger.warn("FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY not set — push notifications are disabled. See FCM.md.");
      return;
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: fcm.projectId,
          clientEmail: fcm.clientEmail,
          // Service-account keys are commonly passed through env vars with
          // literal "\n" sequences instead of real newlines — decode them.
          privateKey: fcm.privateKey.replace(/\\n/g, "\n"),
        }),
      });
    }
    this.enabled = true;
    this.logger.log("FCM initialized");
  }

  /**
   * Sends to every active device registered for `userId`. Never throws —
   * same swallow-and-log philosophy as AuditService.log()/
   * NotificationsService.create(), because a push-delivery failure must
   * never fail the business operation (task assignment, event invite, …)
   * that produced the notification. `pushEnabled` is passed in rather than
   * looked up here — see NotificationsService, which already has the
   * preference row it needs for the DB write and would otherwise duplicate
   * that query.
   */
  async sendToUser(userId: string, payload: PushPayload, pushEnabled: boolean): Promise<void> {
    if (!this.enabled || !pushEnabled) return;

    try {
      const devices = await this.userDevicesService.findMine(userId);
      if (devices.length === 0) return;

      const data: Record<string, string> = { type: payload.type };
      for (const [key, value] of Object.entries(payload.data ?? {})) {
        data[key] = typeof value === "string" ? value : JSON.stringify(value);
      }

      const response = await getMessaging().sendEachForMulticast({
        tokens: devices.map((d) => d.deviceToken),
        notification: { title: payload.title, body: payload.body },
        data,
      });

      await Promise.all(
        response.responses.map((result: SendResponse, index: number) => {
          if (result.success || !result.error || !DEAD_TOKEN_ERROR_CODES.has(result.error.code)) return undefined;
          return this.userDevicesService.deactivateByToken(devices[index].deviceToken);
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to send push notification "${payload.type}" to user ${userId}`, (error as Error).stack);
    }
  }
}
