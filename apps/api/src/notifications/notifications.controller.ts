import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { NotificationsService } from "./notifications.service";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.notificationsService.findAll(user.organizationId, user.sub, query);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user.organizationId, user.sub);
  }

  @Get("preferences")
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.sub);
  }

  @Patch("preferences")
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(user, dto.items);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.organizationId, user.sub);
  }
}
