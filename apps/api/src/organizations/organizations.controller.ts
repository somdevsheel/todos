import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { OrganizationsService } from "./organizations.service";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get("current")
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getCurrent(user.organizationId);
  }

  @Patch("current")
  @Roles("SUPER_ADMIN")
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(user.organizationId, user.sub, dto);
  }
}
