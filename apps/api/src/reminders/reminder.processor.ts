import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { NOTIFICATION_TYPES } from "@arutech/shared-types";
import { NotificationsService } from "../notifications/notifications.service";
import { RemindersService } from "./reminders.service";
import { REMINDERS_QUEUE, type ReminderJobData } from "./reminders.constants";

/**
 * Consumes jobs the scheduler enqueues. `RemindersService.claim()` is the
 * actual idempotency boundary (see its docstring) — this processor trusts
 * it completely: a null claim means some other attempt already handled
 * this reminder, and returning early here is correct, not a missed send.
 */
@Processor(REMINDERS_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly remindersService: RemindersService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const reminder = await this.remindersService.claim(job.data.reminderId);
    if (!reminder) return;

    if (reminder.relatedEntityType === "TASK") {
      if (!reminder.task || reminder.task.deletedAt) return; // task was deleted after the reminder fired — nothing to send
      const isOverdue = reminder.task.dueDate !== null && reminder.task.dueDate.getTime() < Date.now();
      await this.notificationsService.create({
        organizationId: reminder.organizationId,
        userId: reminder.userId,
        type: isOverdue ? NOTIFICATION_TYPES.TASK_OVERDUE : NOTIFICATION_TYPES.TASK_DUE_SOON,
        title: isOverdue ? "Task overdue" : "Task reminder",
        body: reminder.message || `"${reminder.task.title}" ${isOverdue ? "is overdue" : "is coming up"}.`,
        data: { taskId: reminder.taskId },
      });
    } else {
      if (!reminder.event || reminder.event.deletedAt) return; // event was cancelled after the reminder fired
      await this.notificationsService.create({
        organizationId: reminder.organizationId,
        userId: reminder.userId,
        type: NOTIFICATION_TYPES.EVENT_REMINDER,
        title: "Event reminder",
        body: reminder.message || `"${reminder.event.title}" is coming up.`,
        data: { eventId: reminder.eventId },
      });
    }

    this.logger.debug(`Sent reminder ${reminder.id} (${reminder.relatedEntityType})`);
  }
}
