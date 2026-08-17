import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { createEventsService } from "./events.test-utils";

const MANAGER: AuthenticatedUser = { sub: "manager-1", email: "kajal@arutechconsultancy.com", organizationId: "org-1", roles: ["MANAGER"] };
const EMPLOYEE: AuthenticatedUser = { sub: "employee-1", email: "rahul@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };
const OTHER_EMPLOYEE_ID = "employee-2";

function stubFindOneAfterWrite(prisma: ReturnType<typeof createEventsService>["prisma"], overrides: Record<string, unknown> = {}) {
  (prisma.event.findFirst as jest.Mock).mockResolvedValue({
    id: "event-1",
    organizationId: "org-1",
    title: "Sprint planning",
    description: null,
    startAt: new Date("2026-08-20T10:00:00Z"),
    endAt: new Date("2026-08-20T11:00:00Z"),
    isAllDay: false,
    location: null,
    meetingUrl: null,
    createdByUserId: MANAGER.sub,
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [],
    ...overrides,
  });
}

describe("EventsService.create", () => {
  it("rejects an end time at or before the start time", async () => {
    const { eventsService } = createEventsService();
    await expect(
      eventsService.create(EMPLOYEE, { title: "Bad event", startAt: "2026-08-20T11:00:00Z", endAt: "2026-08-20T10:00:00Z" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("always accepts the organizer's own participation and invites everyone else as PENDING", async () => {
    const { eventsService, prisma, notificationsService } = createEventsService();
    (prisma.user.count as jest.Mock).mockResolvedValue(1); // assertUsersInOrg
    (prisma.event.create as jest.Mock).mockResolvedValue({ id: "event-1", title: "Sprint planning", startAt: new Date(), isAllDay: false });
    (prisma.eventParticipant.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    stubFindOneAfterWrite(prisma);

    await eventsService.create(EMPLOYEE, { title: "Sprint planning", startAt: "2026-08-20T10:00:00Z", endAt: "2026-08-20T11:00:00Z", participantUserIds: [OTHER_EMPLOYEE_ID] });

    expect(prisma.eventParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { eventId: "event-1", userId: EMPLOYEE.sub, rsvpStatus: "ACCEPTED" },
        { eventId: "event-1", userId: OTHER_EMPLOYEE_ID, rsvpStatus: "PENDING" },
      ],
    });
    expect(notificationsService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: OTHER_EMPLOYEE_ID, type: "EVENT_CREATED" }),
    ]);
  });

  it("lets a non-privileged employee invite colleagues without a manager role (unlike task assignment)", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (prisma.event.create as jest.Mock).mockResolvedValue({ id: "event-1", title: "1:1", startAt: new Date(), isAllDay: false });
    (prisma.eventParticipant.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    stubFindOneAfterWrite(prisma);

    await expect(
      eventsService.create(EMPLOYEE, { title: "1:1", startAt: "2026-08-20T10:00:00Z", endAt: "2026-08-20T10:30:00Z", participantUserIds: [OTHER_EMPLOYEE_ID] }),
    ).resolves.toBeDefined();
  });

  it("rejects attaching a team calendar the actor isn't a member of", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.team.findFirst as jest.Mock).mockResolvedValue({ id: "team-1", organizationId: "org-1" });
    (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      eventsService.create(EMPLOYEE, { title: "Team sync", startAt: "2026-08-20T10:00:00Z", endAt: "2026-08-20T10:30:00Z", teamId: "team-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lets a privileged role attach a team calendar without a membership row", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.team.findFirst as jest.Mock).mockResolvedValue({ id: "team-1", organizationId: "org-1" });
    (prisma.event.create as jest.Mock).mockResolvedValue({ id: "event-1", title: "Team sync", startAt: new Date(), isAllDay: false });
    (prisma.eventParticipant.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    stubFindOneAfterWrite(prisma);

    await expect(
      eventsService.create(MANAGER, { title: "Team sync", startAt: "2026-08-20T10:00:00Z", endAt: "2026-08-20T10:30:00Z", teamId: "team-1" }),
    ).resolves.toBeDefined();
    expect(prisma.teamMember.findUnique).not.toHaveBeenCalled();
  });
});

describe("EventsService.rsvp", () => {
  it("rejects an RSVP from someone who isn't a participant", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: "event-1", organizationId: "org-1" });
    (prisma.eventParticipant.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(eventsService.rsvp("org-1", "event-1", EMPLOYEE, "ACCEPTED")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lets a participant update their own RSVP status", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: "event-1", organizationId: "org-1" });
    (prisma.eventParticipant.findUnique as jest.Mock).mockResolvedValue({ eventId: "event-1", userId: EMPLOYEE.sub, rsvpStatus: "PENDING" });
    (prisma.eventParticipant.update as jest.Mock).mockResolvedValue({});
    stubFindOneAfterWrite(prisma);

    await eventsService.rsvp("org-1", "event-1", EMPLOYEE, "DECLINED");

    expect(prisma.eventParticipant.update).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: "event-1", userId: EMPLOYEE.sub } },
      data: { rsvpStatus: "DECLINED" },
    });
  });
});

describe("EventsService.update", () => {
  it("notifies every other participant, not the actor, when the event changes", async () => {
    const { eventsService, prisma, notificationsService } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      title: "Sprint planning",
      startAt: new Date("2026-08-20T10:00:00Z"),
      endAt: new Date("2026-08-20T11:00:00Z"),
      isAllDay: false,
      createdByUserId: MANAGER.sub,
    });
    (prisma.event.update as jest.Mock).mockResolvedValue({});
    (prisma.eventParticipant.findMany as jest.Mock).mockResolvedValue([{ userId: MANAGER.sub }, { userId: OTHER_EMPLOYEE_ID }]);
    stubFindOneAfterWrite(prisma);

    await eventsService.update("org-1", "event-1", MANAGER, { location: "Room 4" });

    expect(notificationsService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: OTHER_EMPLOYEE_ID, type: "EVENT_UPDATED" }),
    ]);
  });
});

describe("EventsService.remove", () => {
  it("soft-deletes (never hard-deletes) via updating deletedAt and notifies participants", async () => {
    const { eventsService, prisma, notificationsService } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      title: "Sprint planning",
      startAt: new Date(),
      isAllDay: false,
      createdByUserId: MANAGER.sub,
    });
    (prisma.event.update as jest.Mock).mockResolvedValue({});
    (prisma.eventParticipant.findMany as jest.Mock).mockResolvedValue([{ userId: MANAGER.sub }, { userId: OTHER_EMPLOYEE_ID }]);

    await eventsService.remove("org-1", "event-1", MANAGER);

    expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: "event-1" }, data: { deletedAt: expect.any(Date) } });
    expect(prisma.event.delete).not.toHaveBeenCalled();
    expect(notificationsService.createMany).toHaveBeenCalledWith([expect.objectContaining({ userId: OTHER_EMPLOYEE_ID, type: "EVENT_CANCELLED" })]);
  });

  it("rejects cancellation by someone who isn't the creator or privileged", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: "event-1", organizationId: "org-1", createdByUserId: MANAGER.sub });

    await expect(eventsService.remove("org-1", "event-1", EMPLOYEE)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("EventsService.addParticipant", () => {
  it("is idempotent — adding an existing participant again is a silent no-op", async () => {
    const { eventsService, prisma, auditService } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: "event-1", organizationId: "org-1", createdByUserId: MANAGER.sub });
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (prisma.eventParticipant.findUnique as jest.Mock).mockResolvedValue({ eventId: "event-1", userId: OTHER_EMPLOYEE_ID });

    await eventsService.addParticipant("org-1", "event-1", MANAGER, OTHER_EMPLOYEE_ID);

    expect(prisma.eventParticipant.create).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("lets a user add themselves without needing a privileged role", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: "event-1", organizationId: "org-1", createdByUserId: MANAGER.sub });
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (prisma.eventParticipant.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.eventParticipant.create as jest.Mock).mockResolvedValue({});

    await expect(eventsService.addParticipant("org-1", "event-1", EMPLOYEE, EMPLOYEE.sub)).resolves.toBeUndefined();
  });

  it("rejects adding someone else without a privileged role", async () => {
    const { eventsService, prisma } = createEventsService();
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: "event-1", organizationId: "org-1", createdByUserId: MANAGER.sub });

    await expect(eventsService.addParticipant("org-1", "event-1", EMPLOYEE, OTHER_EMPLOYEE_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
