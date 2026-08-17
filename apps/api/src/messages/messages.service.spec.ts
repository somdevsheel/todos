import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { createMessagesService } from "./messages.test-utils";

const ACTOR: AuthenticatedUser = { sub: "user-1", email: "kajal@arutechconsultancy.com", organizationId: "org-1", roles: ["MANAGER"] };
const RECIPIENT_A = "user-2";
const RECIPIENT_B = "user-3";

function stubCreatedMessage(prisma: ReturnType<typeof createMessagesService>["prisma"], overrides: Record<string, unknown> = {}) {
  (prisma.message.create as jest.Mock).mockResolvedValue({
    id: "msg-1",
    conversationId: "conv-1",
    body: "Hello",
    mentionedUserIds: [],
    editedAt: null,
    createdAt: new Date(),
    senderUser: { id: ACTOR.sub, firstName: "Kajal", lastName: "Verma", avatarUrl: null },
    ...overrides,
  });
}

describe("MessagesService.create", () => {
  it("rejects mentioning someone who isn't a member of the conversation", async () => {
    const { messagesService, conversationsService } = createMessagesService();
    (conversationsService.listMemberUserIds as jest.Mock).mockResolvedValue([ACTOR.sub, RECIPIENT_A]);

    await expect(
      messagesService.create("org-1", ACTOR, "conv-1", { body: "hi @outsider", mentionedUserIds: ["not-a-member"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("broadcasts message:new via the gateway after persisting", async () => {
    const { messagesService, prisma, conversationsService, chatGateway } = createMessagesService();
    (conversationsService.listMemberUserIds as jest.Mock).mockResolvedValue([ACTOR.sub, RECIPIENT_A]);
    stubCreatedMessage(prisma);

    await messagesService.create("org-1", ACTOR, "conv-1", { body: "Hello" });

    expect(chatGateway.broadcastMessageNew).toHaveBeenCalledWith("conv-1", expect.objectContaining({ id: "msg-1", body: "Hello" }));
  });

  it("does not notify a recipient who is focused on the conversation right now, and marks it read for them instead", async () => {
    const { messagesService, prisma, conversationsService, presenceService, notificationsService } = createMessagesService();
    (conversationsService.listMemberUserIds as jest.Mock).mockResolvedValue([ACTOR.sub, RECIPIENT_A]);
    (presenceService.isFocused as jest.Mock).mockImplementation((userId: string) => userId === RECIPIENT_A);
    stubCreatedMessage(prisma);

    await messagesService.create("org-1", ACTOR, "conv-1", { body: "Hello" });

    expect(notificationsService.createMany).not.toHaveBeenCalled();
    expect(conversationsService.markReadForUser).toHaveBeenCalledWith("conv-1", RECIPIENT_A);
  });

  it("notifies a non-focused recipient with NEW_MESSAGE, or MESSAGE_MENTION if they were @mentioned", async () => {
    const { messagesService, prisma, conversationsService, notificationsService } = createMessagesService();
    (conversationsService.listMemberUserIds as jest.Mock).mockResolvedValue([ACTOR.sub, RECIPIENT_A, RECIPIENT_B]);
    stubCreatedMessage(prisma, { mentionedUserIds: [RECIPIENT_B] });

    await messagesService.create("org-1", ACTOR, "conv-1", { body: "Hello @Rahul", mentionedUserIds: [RECIPIENT_B] });

    expect(notificationsService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: RECIPIENT_A, type: "NEW_MESSAGE" }),
      expect.objectContaining({ userId: RECIPIENT_B, type: "MESSAGE_MENTION" }),
    ]);
  });

  it("never notifies the sender themselves", async () => {
    const { messagesService, prisma, conversationsService, notificationsService } = createMessagesService();
    (conversationsService.listMemberUserIds as jest.Mock).mockResolvedValue([ACTOR.sub]);
    stubCreatedMessage(prisma);

    await messagesService.create("org-1", ACTOR, "conv-1", { body: "Hello" });

    expect(notificationsService.createMany).not.toHaveBeenCalled();
  });
});

describe("MessagesService.update", () => {
  it("rejects editing someone else's message", async () => {
    const { messagesService, prisma } = createMessagesService();
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: "msg-1", senderUserId: "someone-else", conversationId: "conv-1" });

    await expect(messagesService.update("org-1", ACTOR, "conv-1", "msg-1", "edited")).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("MessagesService.remove", () => {
  it("soft-deletes and broadcasts message:deleted", async () => {
    const { messagesService, prisma, chatGateway } = createMessagesService();
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: "msg-1", senderUserId: ACTOR.sub, conversationId: "conv-1" });
    (prisma.message.update as jest.Mock).mockResolvedValue({});

    await messagesService.remove("org-1", ACTOR, "conv-1", "msg-1");

    expect(prisma.message.update).toHaveBeenCalledWith({ where: { id: "msg-1" }, data: { deletedAt: expect.any(Date) } });
    expect(chatGateway.broadcastMessageDeleted).toHaveBeenCalledWith("conv-1", "msg-1");
  });

  it("rejects deleting someone else's message", async () => {
    const { messagesService, prisma } = createMessagesService();
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: "msg-1", senderUserId: "someone-else", conversationId: "conv-1" });

    await expect(messagesService.remove("org-1", ACTOR, "conv-1", "msg-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
