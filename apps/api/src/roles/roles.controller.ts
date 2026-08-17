import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { RolesService } from "./roles.service";
import { AssignRoleDto } from "./dto/assign-role.dto";

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("roles")
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get("permissions")
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post("users/:id/roles")
  @Roles("SUPER_ADMIN")
  @OrgScopeResource({ model: "user" })
  assignRole(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AssignRoleDto) {
    return this.rolesService.assignRole(user.organizationId, id, user.sub, dto.role);
  }

  @Delete("users/:id/roles/:role")
  @Roles("SUPER_ADMIN")
  @OrgScopeResource({ model: "user" })
  revokeRole(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("role") role: string) {
    return this.rolesService.revokeRole(user.organizationId, id, user.sub, role);
  }
}
