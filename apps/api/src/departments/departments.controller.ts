import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.findAll(user.organizationId);
  }

  @Post()
  @Roles("SUPER_ADMIN", "ADMIN")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.organizationId, user.sub, dto);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "department" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(user.organizationId, id, user.sub, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @OrgScopeResource({ model: "department" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.departmentsService.remove(user.organizationId, id, user.sub);
  }
}
