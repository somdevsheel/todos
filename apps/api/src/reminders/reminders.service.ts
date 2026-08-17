import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AUDIT_ACTIONS, type ReminderSummary } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { TasksService } from "../tasks/tasks.service";
import { EventsService } from "../events/events.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { CreateReminderDto } from "./dto/create-reminder.dto";

/** What reminder.processor.ts needs to decide notification type/copy without a second round trip. */
export interface ClaimedReminder {
  id: string;
  organizationId: string;
  userId: string;
  relatedEntityType: string;
  taskId: string | null;
  eventId: string | null;
  message: string | null;
  task: { title: string; dueDate: Date | null; deletedAt: Date | null } | null;
  event: { title: string; deletedAt: Date | null } | null;
}

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateReminderDto): Promise<ReminderSummary> {
    const remindAt = new Date(dto.remindAt);
    if (remindAt <= new Date()) throw new BadRequestException("remindAt must be in the future.");

    // Detail pages are visible org-wide (same precedent as TasksService.findOne
    // / EventsService.findOne) — reusing the *OrThrow helpers here both
    // validates the id and confirms it belongs to the caller's org.
    const title =
      dto.relatedEntityType === "TASK"
        ? (await this.tasksService.getTaskOrThrow(actor.organizationId, dto.relatedEntityId)).title
        : (await this.eventsService.getEventOrThrow(actor.organizationId, dto.relatedEntityId)).title;

    try {
      const reminder = await this.prisma.reminder.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.sub,
          relatedEntityType: dto.relatedEntityType,
          relatedEntityId: dto.relatedEntityId,
          taskId: dto.relatedEntityType === "TASK" ? dto.relatedEntityId : undefined,
          eventId: dto.relatedEntityType === "EVENT" ? dto.relatedEntityId : undefined,
          remindAt,
          message: dto.message,
        },
      });

      await this.auditService.log({
        organizationId: actor.organizationId,
        actorUserId: actor.sub,
        action: AUDIT_ACTIONS.REMINDER_CREATED,
        entityType: "Reminder",
        entityId: reminder.id,
        metadata: { relatedEntityType: dto.relatedEntityType, relatedEntityId: dto.relatedEntityId, remindAt: dto.remindAt },
      });

      return this.toSummary(reminder, title);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("You already have a reminder set for this exact time.");
      }
      throw error;
    }
  }

  async findMine(actor: AuthenticatedUser): Promise<ReminderSummary[]> {
    const reminders = await this.prisma.reminder.findMany({
      where: { organizationId: actor.organizationId, userId: actor.sub, isSent: false },
      include: { task: { select: { title: true } }, event: { select: { title: true } } },
      orderBy: { remindAt: "asc" },
    });
    return reminders.map((r) => this.toSummary(r, r.task?.title ?? r.event?.title ?? ""));
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, organizationId: actor.organizationId, userId: actor.sub } });
    if (!reminder) throw new NotFoundException("Reminder not found");
    if (reminder.isSent) throw new BadRequestException("This reminder has already been sent.");

    await this.prisma.reminder.delete({ where: { id } });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.REMINDER_DELETED,
      entityType: "Reminder",
      entityId: id,
    });
  }

  /** Used only by ReminderSchedulerService — the minimal projection needed to enqueue jobs. */
  async findDueIds(now: Date): Promise<string[]> {
    const due = await this.prisma.reminder.findMany({
      where: { isSent: false, remindAt: { lte: now } },
      select: { id: true },
      take: 500,
    });
    return due.map((r) => r.id);
  }

  /**
   * Atomically flips isSent false -> true and returns the reminder only to
   * the caller that performed the transition — the `updateMany` with
   * `isSent: false` in its WHERE clause is itself the idempotency
   * mechanism (works even under two concurrent BullMQ attempts for the
   * same job, not just sequential retries), on top of the DB-level unique
   * constraint documented in reminders/README's predecessor note.
   */
  async claim(id: string): Promise<ClaimedReminder | null> {
    const result = await this.prisma.reminder.updateMany({ where: { id, isSent: false }, data: { isSent: true, sentAt: new Date() } });
    if (result.count === 0) return null;

    return this.prisma.reminder.findUniqueOrThrow({
      where: { id },
      include: {
        task: { select: { title: true, dueDate: true, deletedAt: true } },
        event: { select: { title: true, deletedAt: true } },
      },
    });
  }

  private toSummary(
    reminder: { id: string; relatedEntityType: string; relatedEntityId: string; taskId: string | null; eventId: string | null; remindAt: Date; message: string | null; isSent: boolean; createdAt: Date },
    relatedEntityTitle: string,
  ): ReminderSummary {
    return {
      id: reminder.id,
      relatedEntityType: reminder.relatedEntityType as ReminderSummary["relatedEntityType"],
      relatedEntityId: reminder.relatedEntityId,
      taskId: reminder.taskId,
      eventId: reminder.eventId,
      remindAt: reminder.remindAt.toISOString(),
      message: reminder.message,
      isSent: reminder.isSent,
      createdAt: reminder.createdAt.toISOString(),
      relatedEntityTitle,
    };
  }
}
