import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { ChatGateway } from "./chat.gateway";
import { PresenceService } from "./presence.service";
import { WsTicketController } from "./ws-ticket.controller";
import { WsTicketService } from "./ws-ticket.service";

@Module({
  imports: [ConversationsModule],
  controllers: [WsTicketController],
  providers: [WsTicketService, PresenceService, ChatGateway],
  exports: [PresenceService, ChatGateway],
})
export class WebsocketModule {}
