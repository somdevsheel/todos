import { Injectable } from "@nestjs/common";

/**
 * In-process only (a plain Map, not Redis) — matches the single-instance
 * topology this app actually runs on today (see DEPLOYMENT.md/
 * ARCHITECTURE.md), same reasoning as the Phase 3 reminder worker staying
 * in-process. Known simplification: horizontal scaling would need this
 * fanned out via Redis pub/sub so presence/focus state is shared across
 * instances instead of pinned to whichever one a socket happens to land on.
 */
@Injectable()
export class PresenceService {
  private userSockets = new Map<string, Set<string>>(); // userId -> connected socket ids
  private socketFocus = new Map<string, string>(); // socketId -> conversationId currently open

  /** Returns true if this connection just brought the user online (their first open socket) — the gateway uses this to decide whether to broadcast "presence:online". */
  addConnection(userId: string, socketId: string): boolean {
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    const justCameOnline = sockets.size === 0;
    sockets.add(socketId);
    this.userSockets.set(userId, sockets);
    return justCameOnline;
  }

  /** Returns true if this was the user's last open socket (they just went offline) — same broadcast-decision purpose as addConnection's return value. */
  removeConnection(userId: string, socketId: string): boolean {
    this.socketFocus.delete(socketId);
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    const wentOffline = sockets.size === 0;
    if (wentOffline) this.userSockets.delete(userId);
    return wentOffline;
  }

  setFocus(socketId: string, conversationId: string): void {
    this.socketFocus.set(socketId, conversationId);
  }

  clearFocus(socketId: string): void {
    this.socketFocus.delete(socketId);
  }

  isOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  /** True if any of this user's connected sockets currently has `conversationId` open — drives the notification-dedup rule (see CHAT.md). */
  isFocused(userId: string, conversationId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;
    for (const socketId of sockets) {
      if (this.socketFocus.get(socketId) === conversationId) return true;
    }
    return false;
  }
}
