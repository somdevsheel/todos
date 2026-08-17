import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";

@Controller("conversations/:conversationId/messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string, @Query() query: PaginationQueryDto) {
    return this.messagesService.findAll(user.organizationId, user, conversationId, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string, @Body() dto: CreateMessageDto) {
    return this.messagesService.create(user.organizationId, user, conversationId, dto);
  }

  @Patch(":messageId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.update(user.organizationId, user, conversationId, messageId, dto.body);
  }

  @Delete(":messageId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string, @Param("messageId") messageId: string) {
    return this.messagesService.remove(user.organizationId, user, conversationId, messageId);
  }
}
