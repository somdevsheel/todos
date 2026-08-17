import { Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { WsTicketService } from "./ws-ticket.service";

/**
 * Registered at `/auth/ws-ticket` (a Nest route path isn't tied to which
 * module declares it) — conceptually "yet another token issuance" next to
 * login/refresh, but it's WebSocket-specific infrastructure, so it lives
 * with the rest of that in websocket/ rather than in auth/.
 */
@Controller("auth")
export class WsTicketController {
  constructor(private readonly wsTicketService: WsTicketService) {}

  @Post("ws-ticket")
  @HttpCode(HttpStatus.OK)
  issue(@CurrentUser() user: AuthenticatedUser) {
    return this.wsTicketService.issue({ sub: user.sub, email: user.email, organizationId: user.organizationId, roles: user.roles });
  }
}
