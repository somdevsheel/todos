import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";

@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles("SUPER_ADMIN", "ADMIN")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.announcementsService.findAll(user.organizationId, query);
  }

  @Delete(":id")
  @OrgScopeResource({ model: "announcement" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.announcementsService.remove(user.organizationId, id, user);
  }
}
