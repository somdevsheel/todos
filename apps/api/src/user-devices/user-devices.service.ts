import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RegisterDeviceDto } from "./dto/register-device.dto";

/**
 * Schema-backed device registry — see FCM.md. Nothing sends a push
 * notification to these tokens yet (that lands with the FCM integration
 * in a later phase); this module exists now so the Android app can start
 * registering/deregistering device tokens against a real endpoint from
 * day one, and so "a user can have multiple devices" is true in the data
 * model immediately rather than retrofitted later.
 */
@Injectable()
export class UserDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.userDevice.upsert({
      where: { deviceToken: dto.deviceToken },
      create: {
        userId,
        deviceToken: dto.deviceToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
        appVersion: dto.appVersion,
      },
      update: {
        userId,
        platform: dto.platform,
        deviceName: dto.deviceName,
        appVersion: dto.appVersion,
        lastSeenAt: new Date(),
        isActive: true,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.userDevice.findMany({ where: { userId, isActive: true }, orderBy: { lastSeenAt: "desc" } });
  }

  async remove(userId: string, id: string): Promise<void> {
    const device = await this.prisma.userDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException("Device not found");
    if (device.userId !== userId) throw new ForbiddenException("This device does not belong to you");

    await this.prisma.userDevice.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Called by FcmService when FCM reports a token as unregistered/invalid
   * (see FCM.md point 4) — a system-driven deactivation, not a user action,
   * so unlike remove() there's no ownership check or audit entry (mirrors
   * how ReminderProcessor's markSent isn't audited either). Idempotent: a
   * token already deactivated, or one that was never registered at all
   * (already removed, or from a stale/replayed FCM response), is a no-op.
   */
  async deactivateByToken(deviceToken: string): Promise<void> {
    await this.prisma.userDevice.updateMany({ where: { deviceToken, isActive: true }, data: { isActive: false } });
  }
}
