import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { MessageSummary } from "@arutech/shared-types";
import { ConversationsService } from "../conversations/conversations.service";
import { PresenceService } from "./presence.service";
import { WsTicketService, type WsIdentity } from "./ws-ticket.service";

interface AuthenticatedSocket extends Socket {
  // conversationIds is captured once at connect time and read again at
  // disconnect — by the time handleDisconnect fires, Socket.IO has already
  // removed the socket from every room it joined, so `client.rooms` can't
  // be trusted for "which rooms should hear this user went offline."
  data: { user?: WsIdentity; conversationIds?: string[] };
}

function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/**
 * The one authenticated Socket.IO gateway for the app (see CHAT.md). Auth
 * happens once, in a `server.use()` middleware registered from afterInit —
 * deliberately NOT in the OnGatewayConnection lifecycle hook. Socket.IO
 * doesn't complete the client's handshake (and so doesn't fire its
 * 'connect' event) until every `server.use()` middleware has called
 * `next()`; an async `handleConnection` runs *after* that handshake
 * already completed, which left a real race the first version of this
 * gateway had: a client could emit `conversation:focus`/`typing:*`
 * immediately on 'connect' and have it silently no-op because the
 * server's ticket verification + room-join hadn't finished yet. Doing
 * that work in middleware instead means `client.data.user` and every
 * conversation room are guaranteed to be ready before the client ever
 * sees a successful connection, closing that window entirely.
 */
@WebSocketGateway({ path: "/socket.io" })
export class ChatGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly wsTicketService: WsTicketService,
    private readonly presenceService: PresenceService,
    private readonly conversationsService: ConversationsService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      this.authenticate(socket as AuthenticatedSocket)
        .then(() => next())
        .catch((error: Error) => next(error));
    });
  }

  handleConnection(client: AuthenticatedSocket): void {
    // By the time this fires, the middleware above has already resolved —
    // client.data.user and this socket's conversation rooms are ready.
    const user = client.data.user!;
    const justCameOnline = this.presenceService.addConnection(user.sub, client.id);
    this.logger.debug(`Socket ${client.id} connected as user ${user.sub}, in rooms: ${[...client.rooms].join(", ")}`);

    // Only broadcast to people who'd actually see it: the conversations
    // this user shares with others, not a global "someone came online"
    // blast — see the class docstring's presence-tracking note.
    if (justCameOnline) this.broadcastPresence(client.data.conversationIds ?? [], "presence:online", user.sub);

    // One-time initial state for this connection — without it, a freshly
    // opened chat UI would show everyone as offline until the next
    // transition happened to fire (which might be minutes away).
    void this.sendPresenceSnapshot(client, user);
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const user = client.data.user;
    if (!user) return;
    const wentOffline = this.presenceService.removeConnection(user.sub, client.id);
    if (wentOffline) this.broadcastPresence(client.data.conversationIds ?? [], "presence:offline", user.sub);
  }

  @SubscribeMessage("typing:start")
  handleTypingStart(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: { conversationId?: string }): void {
    this.relayTyping(client, body?.conversationId, "typing:start");
  }

  @SubscribeMessage("typing:stop")
  handleTypingStop(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: { conversationId?: string }): void {
    this.relayTyping(client, body?.conversationId, "typing:stop");
  }

  @SubscribeMessage("conversation:focus")
  async handleFocus(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: { conversationId?: string }): Promise<void> {
    const user = client.data.user;
    if (!user || !body?.conversationId || !this.isMember(client, body.conversationId)) return;

    this.presenceService.setFocus(client.id, body.conversationId);
    // Opening a conversation is exactly "reading" it — same as the REST
    // PATCH /conversations/:id/read endpoint, just triggered by the client
    // switching threads instead of an explicit button.
    await this.conversationsService.markRead(user.organizationId, user, body.conversationId);
  }

  @SubscribeMessage("conversation:blur")
  handleBlur(@ConnectedSocket() client: AuthenticatedSocket): void {
    this.presenceService.clearFocus(client.id);
  }

  /** Called by MessagesService after persisting a new message — not a client-originated event. */
  broadcastMessageNew(conversationId: string, message: MessageSummary): void {
    this.server.to(conversationRoom(conversationId)).emit("message:new", message);
  }

  broadcastMessageUpdated(conversationId: string, message: MessageSummary): void {
    this.server.to(conversationRoom(conversationId)).emit("message:updated", message);
  }

  broadcastMessageDeleted(conversationId: string, messageId: string): void {
    this.server.to(conversationRoom(conversationId)).emit("message:deleted", { id: messageId, conversationId });
  }

  private isMember(client: AuthenticatedSocket, conversationId: string): boolean {
    return client.rooms.has(conversationRoom(conversationId));
  }

  private relayTyping(client: AuthenticatedSocket, conversationId: string | undefined, event: "typing:start" | "typing:stop"): void {
    const user = client.data.user;
    if (!user || !conversationId || !this.isMember(client, conversationId)) return;
    client.to(conversationRoom(conversationId)).emit(event, { conversationId, userId: user.sub });
  }

  private broadcastPresence(conversationIds: string[], event: "presence:online" | "presence:offline", userId: string): void {
    for (const conversationId of conversationIds) {
      this.server.to(conversationRoom(conversationId)).emit(event, { userId });
    }
  }

  private async sendPresenceSnapshot(client: AuthenticatedSocket, user: WsIdentity): Promise<void> {
    const coMemberIds = await this.conversationsService.listCoMemberUserIds(user.sub, user.organizationId);
    const onlineUserIds = coMemberIds.filter((id) => this.presenceService.isOnline(id));
    client.emit("presence:snapshot", { onlineUserIds });
  }

  private async authenticate(socket: AuthenticatedSocket): Promise<void> {
    const ticket = socket.handshake.auth?.["ticket"] as string | undefined;
    const identity = ticket ? await this.wsTicketService.consume(ticket) : null;
    if (!identity) throw new Error("Invalid or expired connection ticket");

    socket.data.user = identity;
    const conversationIds = await this.conversationsService.listMemberConversationIds(identity.sub, identity.organizationId);
    socket.data.conversationIds = conversationIds;
    await socket.join(conversationIds.map(conversationRoom));
  }
}
