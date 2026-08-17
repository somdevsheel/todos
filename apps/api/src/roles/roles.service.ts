import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, type RoleName, type RoleWithPermissions } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAllRoles(): Promise<RoleWithPermissions[]> {
    const roles = await this.prisma.role.findMany({
      include: { rolePermissions: { select: { permissionId: true } } },
      orderBy: { name: "asc" },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name as RoleName,
      description: role.description,
      isSystem: role.isSystem,
      permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
    }));
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  /**
   * Replaces the role's full permission set (delete-all-then-recreate —
   * the simplest correct semantics for a checkbox-grid UI; no incremental
   * add/remove endpoints needed). Makes RolePermission real and editable,
   * which `prisma/seed.ts`'s own comment flagged as the gap this closes —
   * but note this doesn't gate any endpoint yet: every guard in this app
   * checks role *names*, never permission keys. See ARCHITECTURE.md's
   * Phase 7 entry.
   */
  async updateRolePermissions(roleId: string, permissionIds: string[], actor: AuthenticatedUser): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException("Role not found");

    const uniqueIds = [...new Set(permissionIds)];
    if (uniqueIds.length) {
      const count = await this.prisma.permission.count({ where: { id: { in: uniqueIds } } });
      if (count !== uniqueIds.length) throw new BadRequestException("One or more permissions don't exist.");
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({ data: uniqueIds.map((permissionId) => ({ roleId, permissionId })) }),
    ]);

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED,
      entityType: "Role",
      entityId: roleId,
      metadata: { permissionIds: uniqueIds },
    });

    return { id: role.id, name: role.name as RoleName, description: role.description, isSystem: role.isSystem, permissionIds: uniqueIds };
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
