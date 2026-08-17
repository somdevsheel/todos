import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Event, Prisma } from "@prisma/client";
import { AUDIT_ACTIONS, NOTIFICATION_TYPES, type EventDetail, type EventRsvpStatus } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import type { ListEventsQueryDto } from "./dto/list-events-query.dto";
import { isPrivilegedForEvents } from "./event-authorization.util";
import { formatEventTime } from "./format-event-time.util";

type EventWithParticipants = Event & {
  participants: Array<{
    rsvpStatus: EventRsvpStatus;
    user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  }>;
};

const PARTICIPANTS_INCLUDE = {
  participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
} satisfies Prisma.EventInclude;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateEventDto): Promise<EventDetail> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException("endAt must be after startAt.");

    if (dto.teamId) await this.assertActorCanUseTeam(actor, dto.teamId);

    const participantIds = new Set((dto.participantUserIds ?? []).filter((id) => id !== actor.sub));
    if (participantIds.size) await this.assertUsersInOrg(actor.organizationId, [...participantIds]);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          organizationId: actor.organizationId,
          createdByUserId: actor.sub,
          title: dto.title,
          description: dto.description,
          startAt,
          endAt,
          isAllDay: dto.isAllDay ?? false,
          location: dto.location,
          meetingUrl: dto.meetingUrl,
          teamId: dto.teamId,
        },
      });
      // The organizer is always a participant, pre-accepted — matches how
      // TasksService.create always adds the creator as an assignee when no
      // others are named, except here the creator is *always* included
      // alongside any explicit invitees rather than only as a fallback,
      // since "I'm on my own calendar" is true regardless of who else is invited.
      await tx.eventParticipant.createMany({
        data: [
          { eventId: created.id, userId: actor.sub, rsvpStatus: "ACCEPTED" },
          ...[...participantIds].map((userId) => ({ eventId: created.id, userId, rsvpStatus: "PENDING" as const })),
        ],
      });
      return created;
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.EVENT_CREATED,
      entityType: "Event",
      entityId: event.id,
      metadata: { title: dto.title, participantUserIds: [...participantIds] },
    });

    await this.notifyInvite(actor, event, [...participantIds]);

    return this.findOne(actor.organizationId, event.id);
  }

  /**
   * A bounded [from, to) range query, not a paginated list — the caller
   * (the web calendar view) always supplies a concrete date window. Default
   * scope is "my calendar" (creator or participant); `query.teamId` switches
   * to a team calendar instead. There is deliberately no org-wide "every
   * event" mode in this phase — see ARCHITECTURE.md's Phase 3 entry.
   */
  async findAll(organizationId: string, actor: AuthenticatedUser, query: ListEventsQueryDto): Promise<EventDetail[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const scopeCondition: Prisma.EventWhereInput = query.teamId
      ? await this.teamScopeCondition(actor, query.teamId)
      : { OR: [{ createdByUserId: actor.sub }, { participants: { some: { userId: actor.sub } } }] };

    const events = await this.prisma.event.findMany({
      where: {
        organizationId,
        deletedAt: null,
        startAt: { lt: to },
        endAt: { gt: from },
        AND: [scopeCondition],
      },
      include: PARTICIPANTS_INCLUDE,
      orderBy: { startAt: "asc" },
    });

    return events.map((event) => this.toSummary(event));
  }

  async findOne(organizationId: string, id: string): Promise<EventDetail> {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: PARTICIPANTS_INCLUDE,
    });
    if (!event) throw new NotFoundException("Event not found");
    return this.toSummary(event);
  }

  async update(organizationId: string, id: string, actor: AuthenticatedUser, dto: UpdateEventDto): Promise<EventDetail> {
    const event = await this.getEventOrThrow(organizationId, id);
    this.assertIsCreatorOrPrivileged(event, actor);

    const startAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : event.endAt;
    if (endAt <= startAt) throw new BadRequestException("endAt must be after startAt.");

    if (dto.teamId) await this.assertActorCanUseTeam(actor, dto.teamId);

    await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt ? startAt : undefined,
        endAt: dto.endAt ? endAt : undefined,
        isAllDay: dto.isAllDay,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        teamId: dto.teamId,
      },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.EVENT_UPDATED,
      entityType: "Event",
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    // Unlike TasksService.update (which doesn't notify on a plain edit —
    // only assignment/completion produce notifications), every participant
    // genuinely needs to know when a meeting's time/place changes, so this
    // producer exists specifically for that (NOTIFICATION_TYPES.EVENT_UPDATED).
    await this.notifyParticipants(organizationId, id, actor.sub, NOTIFICATION_TYPES.EVENT_UPDATED, "Event updated", `"${event.title}" was changed.`);

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, actor: AuthenticatedUser): Promise<void> {
    const event = await this.getEventOrThrow(organizationId, id);
    this.assertIsCreatorOrPrivileged(event, actor);

    await this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.EVENT_DELETED,
      entityType: "Event",
      entityId: id,
    });

    await this.notifyParticipants(
      organizationId,
      id,
      actor.sub,
      NOTIFICATION_TYPES.EVENT_CANCELLED,
      "Event cancelled",
      `"${event.title}" (${formatEventTime(event.startAt, event.isAllDay)}) was cancelled.`,
    );
  }

  async rsvp(organizationId: string, id: string, actor: AuthenticatedUser, status: EventRsvpStatus): Promise<EventDetail> {
    await this.getEventOrThrow(organizationId, id);

    const participant = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId: id, userId: actor.sub } } });
    if (!participant) throw new NotFoundException("You are not a participant on this event.");

    await this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId: id, userId: actor.sub } },
      data: { rsvpStatus: status },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.EVENT_RSVP_UPDATED,
      entityType: "Event",
      entityId: id,
      metadata: { status },
    });

    return this.findOne(organizationId, id);
  }

  async addParticipant(organizationId: string, id: string, actor: AuthenticatedUser, userId: string): Promise<void> {
    const event = await this.getEventOrThrow(organizationId, id);
    if (userId !== actor.sub) this.assertIsCreatorOrPrivileged(event, actor);
    await this.assertUsersInOrg(organizationId, [userId]);

    const existing = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId: id, userId } } });
    if (existing) return; // idempotent — no duplicate audit/notification noise

    await this.prisma.eventParticipant.create({ data: { eventId: id, userId, rsvpStatus: "PENDING" } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.EVENT_PARTICIPANT_ADDED,
      entityType: "Event",
      entityId: id,
      metadata: { userId },
    });

    await this.notifyInvite(actor, event, [userId]);
  }

  async removeParticipant(organizationId: string, id: string, actor: AuthenticatedUser, userId: string): Promise<void> {
    const event = await this.getEventOrThrow(organizationId, id);
    if (userId !== actor.sub) this.assertIsCreatorOrPrivileged(event, actor);
    if (userId === event.createdByUserId) throw new BadRequestException("The organizer can't be removed from their own event.");

    const existing = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId: id, userId } } });
    if (!existing) throw new NotFoundException("This person is not on this event.");

    await this.prisma.eventParticipant.delete({ where: { eventId_userId: { eventId: id, userId } } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.EVENT_PARTICIPANT_REMOVED,
      entityType: "Event",
      entityId: id,
      metadata: { userId },
    });
  }

  // ---------------------------------------------------------------------
  // Shared helpers (getEventOrThrow is also used by RemindersService — see
  // its constructor — mirroring TasksService.getTaskOrThrow's reuse).
  // ---------------------------------------------------------------------

  async getEventOrThrow(organizationId: string, id: string): Promise<Event> {
    const event = await this.prisma.event.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  private assertIsCreatorOrPrivileged(event: Event, actor: AuthenticatedUser): void {
    if (event.createdByUserId === actor.sub || isPrivilegedForEvents(actor.roles)) return;
    throw new ForbiddenException("You don't have permission to modify this event.");
  }

  private async notifyInvite(actor: AuthenticatedUser, event: Event, participantUserIds: string[]): Promise<void> {
    const notifyIds = participantUserIds.filter((id) => id !== actor.sub);
    if (notifyIds.length === 0) return;

    await this.notificationsService.createMany(
      notifyIds.map((userId) => ({
        organizationId: actor.organizationId,
        userId,
        type: NOTIFICATION_TYPES.EVENT_CREATED,
        title: "New event invitation",
        body: `You've been invited to "${event.title}" — ${formatEventTime(event.startAt, event.isAllDay)}`,
        data: { eventId: event.id },
      })),
    );
  }

  private async notifyParticipants(
    organizationId: string,
    eventId: string,
    excludeUserId: string,
    type: string,
    title: string,
    body: string,
  ): Promise<void> {
    const participants = await this.prisma.eventParticipant.findMany({ where: { eventId }, select: { userId: true } });
    const notifyIds = participants.map((p) => p.userId).filter((id) => id !== excludeUserId);
    if (notifyIds.length === 0) return;

    await this.notificationsService.createMany(
      notifyIds.map((userId) => ({ organizationId, userId, type, title, body, data: { eventId } })),
    );
  }

  private async assertUsersInOrg(organizationId: string, userIds: string[]): Promise<void> {
    const count = await this.prisma.user.count({ where: { id: { in: userIds }, organizationId, deletedAt: null } });
    if (count !== userIds.length) throw new BadRequestException("One or more participants are not part of this organization.");
  }

  private async assertActorCanUseTeam(actor: AuthenticatedUser, teamId: string): Promise<void> {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, organizationId: actor.organizationId, deletedAt: null } });
    if (!team) throw new NotFoundException("Team not found");
    if (isPrivilegedForEvents(actor.roles)) return;

    const membership = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: actor.sub } } });
    if (!membership) throw new ForbiddenException("You must be a member of this team to put an event on its calendar.");
  }

  private async teamScopeCondition(actor: AuthenticatedUser, teamId: string): Promise<Prisma.EventWhereInput> {
    await this.assertActorCanUseTeam(actor, teamId);
    return { teamId };
  }

  private toSummary(event: EventWithParticipants): EventDetail {
    return {
      id: event.id,
      organizationId: event.organizationId,
      title: event.title,
      description: event.description,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      isAllDay: event.isAllDay,
      location: event.location,
      meetingUrl: event.meetingUrl,
      createdByUserId: event.createdByUserId,
      teamId: event.teamId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      participants: event.participants.map((p) => ({
        id: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        avatarUrl: p.user.avatarUrl,
        rsvpStatus: p.rsvpStatus,
      })),
    };
  }
}
