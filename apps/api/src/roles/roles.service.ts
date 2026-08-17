import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, type RoleName } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAllRoles() {
    return this.prisma.role.findMany({ orderBy: { name: "asc" } });
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  async assignRole(organizationId: string, userId: string, actorId: string, roleName: RoleName): Promise<void> {
    const [user, role] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: userId, organizationId, deletedAt: null } }),
      this.prisma.role.findUnique({ where: { name: roleName } }),
    ]);
    if (!user) throw new NotFoundException("User not found");
    if (!role) throw new NotFoundException("Role not found");

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId_organizationId: { userId, roleId: role.id, organizationId } },
    });
    if (existing) throw new ConflictException("User already has this role.");

    await this.prisma.userRole.create({
      data: { userId, roleId: role.id, organizationId, assignedByUserId: actorId },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.ROLE_ASSIGNED,
      entityType: "User",
      entityId: userId,
      metadata: { role: roleName },
    });
  }

  async revokeRole(organizationId: string, userId: string, actorId: string, roleName: string): Promise<void> {
    if (userId === actorId && roleName === "SUPER_ADMIN") {
      throw new ConflictException("You cannot revoke your own Super Admin role.");
    }

    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException("Role not found");

    await this.prisma.userRole.deleteMany({ where: { userId, roleId: role.id, organizationId } });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.ROLE_REVOKED,
      entityType: "User",
      entityId: userId,
      metadata: { role: roleName },
    });
  }
}
