import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.findAll(user.organizationId);
  }

  @Post()
  @Roles("SUPER_ADMIN", "ADMIN", "MANAGER")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.organizationId, user.sub, dto);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "ADMIN", "MANAGER")
  @OrgScopeResource({ model: "team" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(user.organizationId, id, user.sub, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "team" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.teamsService.remove(user.organizationId, id, user.sub);
  }

  @Get(":id/members")
  @OrgScopeResource({ model: "team" })
  listMembers(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.teamsService.listMembers(user.organizationId, id);
  }

  @Post(":id/members")
  @Roles("SUPER_ADMIN", "ADMIN", "MANAGER")
  @OrgScopeResource({ model: "team" })
  addMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AddTeamMemberDto) {
    return this.teamsService.addMember(user.organizationId, id, user.sub, dto.userId);
  }

  @Delete(":id/members/:userId")
  @Roles("SUPER_ADMIN", "ADMIN", "MANAGER")
  @OrgScopeResource({ model: "team" })
  removeMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("userId") userId: string) {
    return this.teamsService.removeMember(user.organizationId, id, user.sub, userId);
  }
}
