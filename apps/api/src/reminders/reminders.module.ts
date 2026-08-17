import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import type { RedisConfig } from "../config/configuration";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TasksModule } from "../tasks/tasks.module";
import { EventsModule } from "../events/events.module";
import { RemindersController } from "./reminders.controller";
import { RemindersService } from "./reminders.service";
import { ReminderSchedulerService } from "./reminder-scheduler.service";
import { ReminderProcessor } from "./reminder.processor";
import { REMINDERS_QUEUE } from "./reminders.constants";

@Module({
  imports: [
    TasksModule,
    EventsModule,
    AuditModule,
    NotificationsModule,
    BullModule.registerQueueAsync({
      name: REMINDERS_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // BullMQ requires maxRetriesPerRequest: null on its own connection
        // (see the Redis/RedisConfig split — this queue gets a dedicated
        // ioredis client, distinct from any future cache/session client).
        connection: new Redis(configService.get<RedisConfig>("redis")!.url, { maxRetriesPerRequest: null }),
      }),
    }),
  ],
  controllers: [RemindersController],
  providers: [RemindersService, ReminderSchedulerService, ReminderProcessor],
})
export class RemindersModule {}
