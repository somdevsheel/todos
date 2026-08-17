import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { createConversationsService } from "./conversations.test-utils";

const ACTOR: AuthenticatedUser = { sub: "user-1", email: "kajal@arutechconsultancy.com", organizationId: "org-1", roles: ["MANAGER"] };
const OTHER_USER_ID = "user-2";

function stubFindOneAfterWrite(prisma: ReturnType<typeof createConversationsService>["prisma"], overrides: Record<string, unknown> = {}) {
  (prisma.conversationMember.findUnique as jest.Mock).mockResolvedValue({ conversationId: "conv-1", userId: ACTOR.sub, lastReadAt: new Date() });
  (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: (overrides.id as string) ?? "conv-1", organizationId: "org-1" });
  (prisma.conversation.findFirstOrThrow as jest.Mock).mockResolvedValue({
    id: "conv-1",
    organizationId: "org-1",
    type: "DIRECT",
    name: null,
    createdByUserId: ACTOR.sub,
    createdAt: new Date(),
    members: [
      { userId: ACTOR.sub, lastReadAt: new Date(), user: { id: ACTOR.sub, firstName: "Kajal", lastName: "Verma", avatarUrl: null } },
      { userId: OTHER_USER_ID, lastReadAt: new Date(), user: { id: OTHER_USER_ID, firstName: "Rahul", lastName: "Iyer", avatarUrl: null } },
    ],
    messages: [],
    ...overrides,
  });
  (prisma.message.count as jest.Mock).mockResolvedValue(0);
}

describe("ConversationsService.create", () => {
  it("reuses an existing DIRECT conversation between the same two people instead of creating a duplicate", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: "conv-existing" });
    stubFindOneAfterWrite(prisma, { id: "conv-existing" });

    const result = await conversationsService.create(ACTOR, { type: "DIRECT", memberUserIds: [OTHER_USER_ID] });

    expect(result.id).toBe("conv-existing");
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it("rejects a DIRECT conversation with more than one other participant", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.user.count as jest.Mock).mockResolvedValue(2);

    await expect(
      conversationsService.create(ACTOR, { type: "DIRECT", memberUserIds: [OTHER_USER_ID, "user-3"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates a GROUP conversation with the creator plus every named member", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.user.count as jest.Mock).mockResolvedValue(2);
    (prisma.conversation.create as jest.Mock).mockResolvedValue({ id: "conv-1" });
    (prisma.conversationMember.createMany as jest.Mock).mockResolvedValue({ count: 3 });
    stubFindOneAfterWrite(prisma, { type: "GROUP", name: "Launch squad" });

    await conversationsService.create(ACTOR, { type: "GROUP", name: "Launch squad", memberUserIds: [OTHER_USER_ID, "user-3"] });

    expect(prisma.conversationMember.createMany).toHaveBeenCalledWith({
      data: [
        { conversationId: "conv-1", userId: ACTOR.sub, lastReadAt: expect.any(Date) },
        { conversationId: "conv-1", userId: OTHER_USER_ID, lastReadAt: expect.any(Date) },
        { conversationId: "conv-1", userId: "user-3", lastReadAt: expect.any(Date) },
      ],
    });
  });
});

describe("ConversationsService.getMembershipOrThrow", () => {
  it("throws NotFound (not Forbidden) for someone who isn't a member", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.conversationMember.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(conversationsService.getMembershipOrThrow("conv-1", "bystander")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ConversationsService.markReadForUser", () => {
  it("updates lastReadAt without a membership round trip", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.conversationMember.update as jest.Mock).mockResolvedValue({});

    await conversationsService.markReadForUser("conv-1", OTHER_USER_ID);

    expect(prisma.conversationMember.update).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "conv-1", userId: OTHER_USER_ID } },
      data: { lastReadAt: expect.any(Date) },
    });
  });
});

describe("ConversationsService.addMember", () => {
  it("rejects adding a third person to a DIRECT conversation", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: "conv-1", organizationId: "org-1", type: "DIRECT", createdByUserId: ACTOR.sub });
    (prisma.conversationMember.findUnique as jest.Mock).mockResolvedValue({ conversationId: "conv-1", userId: ACTOR.sub });

    await expect(conversationsService.addMember("org-1", ACTOR, "conv-1", "user-3")).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("ConversationsService.removeMember", () => {
  it("rejects removing someone else unless the actor is the conversation's creator", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: "conv-1", organizationId: "org-1", type: "GROUP", createdByUserId: OTHER_USER_ID });

    const bystander: AuthenticatedUser = { sub: "user-3", email: "x@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };
    await expect(conversationsService.removeMember("org-1", bystander, "conv-1", ACTOR.sub)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lets anyone remove themselves", async () => {
    const { conversationsService, prisma } = createConversationsService();
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: "conv-1", organizationId: "org-1", type: "GROUP", createdByUserId: OTHER_USER_ID });
    (prisma.conversationMember.findUnique as jest.Mock).mockResolvedValue({ conversationId: "conv-1", userId: ACTOR.sub });
    (prisma.conversationMember.delete as jest.Mock).mockResolvedValue({});

    await expect(conversationsService.removeMember("org-1", ACTOR, "conv-1", ACTOR.sub)).resolves.toBeUndefined();
  });
});
