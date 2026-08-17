import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { RemindersService } from "./reminders.service";
import { REMINDERS_QUEUE, type ReminderJobData } from "./reminders.constants";

/**
 * Runs inside the API process today (see ARCHITECTURE.md's Phase 3 note —
 * splitting this into the dedicated `workspace-worker` container is a
 * Phase 8 packaging concern, not a code change). Every minute, finds
 * reminders whose remindAt has arrived and hands each one to BullMQ —
 * `jobId: reminder.id` means re-adding the same due reminder on a later
 * tick (if a previous job is still in flight) is a harmless no-op, not a
 * duplicate job.
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    @InjectQueue(REMINDERS_QUEUE) private readonly queue: Queue<ReminderJobData>,
    private readonly remindersService: RemindersService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueReminders(): Promise<void> {
    const dueIds = await this.remindersService.findDueIds(new Date());
    for (const reminderId of dueIds) {
      await this.queue.add(
        "send-reminder",
        { reminderId },
        { jobId: reminderId, removeOnComplete: true, removeOnFail: 50 },
      );
    }
    if (dueIds.length > 0) this.logger.log(`Enqueued ${dueIds.length} due reminder(s)`);
  }
}
