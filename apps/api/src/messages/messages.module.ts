import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ConversationsModule } from "../conversations/conversations.module";
import { WebsocketModule } from "../websocket/websocket.module";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";

@Module({
  imports: [ConversationsModule, WebsocketModule, AuditModule, NotificationsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
