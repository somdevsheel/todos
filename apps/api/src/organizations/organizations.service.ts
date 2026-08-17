import { Injectable } from "@nestjs/common";
import { AUDIT_ACTIONS, type OrganizationSummary } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getCurrent(organizationId: string): Promise<OrganizationSummary> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    return { id: org.id, name: org.name, slug: org.slug, domain: org.domain, logoUrl: org.logoUrl };
  }

  async update(organizationId: string, actorId: string, dto: UpdateOrganizationDto): Promise<OrganizationSummary> {
    const org = await this.prisma.organization.update({ where: { id: organizationId }, data: dto });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
      entityType: "Organization",
      entityId: organizationId,
      metadata: dto as Record<string, unknown>,
    });

    return { id: org.id, name: org.name, slug: org.slug, domain: org.domain, logoUrl: org.logoUrl };
  }
}
