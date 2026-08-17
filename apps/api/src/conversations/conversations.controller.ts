import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { ConversationsService } from "./conversations.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { AddConversationMemberDto } from "./dto/add-conversation-member.dto";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.findAll(user.organizationId, user);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.conversationsService.findOne(user.organizationId, user, id);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.conversationsService.markRead(user.organizationId, user, id);
  }

  @Post(":id/members")
  addMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AddConversationMemberDto) {
    return this.conversationsService.addMember(user.organizationId, user, id, dto.userId);
  }

  @Delete(":id/members/:userId")
  removeMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("userId") userId: string) {
    return this.conversationsService.removeMember(user.organizationId, user, id, userId);
  }
}
