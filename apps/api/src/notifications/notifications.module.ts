import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FcmModule } from "../fcm/fcm.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuditModule, FcmModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
