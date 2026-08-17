import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { AuthService } from "../auth/auth.service";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.sub);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(user.organizationId, query);
  }

  @Get(":id")
  @OrgScopeResource({ model: "user" })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.usersService.findOne(user.organizationId, id);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "user" })
  adminUpdate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(user.organizationId, id, user.sub, dto);
  }

  @Post(":id/deactivate")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "user" })
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.usersService.deactivate(user.organizationId, id, user.sub);
  }

  @Post(":id/activate")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "user" })
  activate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.usersService.activate(user.organizationId, id, user.sub);
  }

  // Note: reinvite lives on AuthService (it owns invitation-token generation
  // and the invite email template) — routed through /users/:id/reinvite
  // rather than /auth/reinvite/:id so it sits next to activate/deactivate,
  // matching how the employee-actions UI groups these together.
  @Post(":id/reinvite")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "user" })
  reinvite(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.authService.reinvite({ sub: user.sub, organizationId: user.organizationId }, id);
  }
}
