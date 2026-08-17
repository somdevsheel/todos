import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { AuditService } from "./audit.service";
import { ListAuditLogsDto } from "./dto/list-audit-logs.dto";

@Controller("audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles("SUPER_ADMIN")
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditLogsDto) {
    return this.auditService.findAll({
      organizationId: user.organizationId,
      action: query.action,
      entityType: query.entityType,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
