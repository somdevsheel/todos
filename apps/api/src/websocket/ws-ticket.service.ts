import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { generateOpaqueToken } from "../auth/token.util";
import { REDIS_CLIENT } from "../redis/redis.constants";

const TICKET_TTL_SECONDS = 30;
const KEY_PREFIX = "ws-ticket:";

/** Structurally matches AuthenticatedUser (see common/types/authenticated-request.ts) so it can be passed anywhere an actor is expected — e.g. ConversationsService.markRead from ChatGateway's "conversation:focus" handler. */
export interface WsIdentity {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
}

/**
 * Bridges the httpOnly-cookie web session to the WebSocket gateway without
 * ever exposing the real access token to browser JS — see the "WebSocket
 * authentication" section in AUTHENTICATION.md for the full rationale.
 * A ticket is single-use (consumed atomically via GETDEL) and short-lived
 * (30s — long enough to cover the fetch-ticket-then-connect round trip,
 * short enough that a leaked ticket is worthless almost immediately).
 */
@Injectable()
export class WsTicketService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async issue(identity: WsIdentity): Promise<{ ticket: string; expiresInSeconds: number }> {
    const ticket = generateOpaqueToken();
    await this.redis.set(KEY_PREFIX + ticket, JSON.stringify(identity), "EX", TICKET_TTL_SECONDS);
    return { ticket, expiresInSeconds: TICKET_TTL_SECONDS };
  }

  async consume(ticket: string): Promise<WsIdentity | null> {
    const raw = await this.redis.getdel(KEY_PREFIX + ticket);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WsIdentity;
    } catch {
      return null;
    }
  }
}
