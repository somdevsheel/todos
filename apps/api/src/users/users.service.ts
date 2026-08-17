import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { User } from "@prisma/client";
import { AUDIT_ACTIONS, type CurrentUser, type PaginatedResult, type RoleName, type UserSummary } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { AdminUpdateUserDto } from "./dto/admin-update-user.dto";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findMe(userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const roles = await this.getRoleNames(user.id, user.organizationId);
    return this.toCurrentUser(user, roles);
  }

  async findAll(organizationId: string, query: ListUsersQueryDto): Promise<PaginatedResult<UserSummary>> {
    const where = {
      organizationId,
      deletedAt: null,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" as const } },
              { lastName: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { userRoles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => this.toSummary(user, user.userRoles.map((ur) => ur.role.name as RoleName))),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findOne(organizationId: string, id: string): Promise<UserSummary> {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found");
    const roles = await this.getRoleNames(user.id, organizationId);
    return this.toSummary(user, roles);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<CurrentUser> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    const roles = await this.getRoleNames(user.id, user.organizationId);
    return this.toCurrentUser(user, roles);
  }

  async adminUpdate(organizationId: string, id: string, actorId: string, dto: AdminUpdateUserDto): Promise<UserSummary> {
    const existing = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException("User not found");

    const user = await this.prisma.user.update({ where: { id }, data: dto });
    const roles = await this.getRoleNames(user.id, organizationId);

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: "User",
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return this.toSummary(user, roles);
  }

  async deactivate(organizationId: string, id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new ForbiddenException("You cannot deactivate your own account.");
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { status: "DEACTIVATED" } }),
      this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.USER_DISABLED,
      entityType: "User",
      entityId: id,
    });
  }

  async activate(organizationId: string, id: string, actorId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found");
    if (!user.passwordHash) {
      throw new ForbiddenException("This user has not accepted their invitation yet.");
    }

    await this.prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.USER_REACTIVATED,
      entityType: "User",
      entityId: id,
    });
  }

  private async getRoleNames(userId: string, organizationId: string): Promise<RoleName[]> {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId, organizationId }, include: { role: true } });
    return userRoles.map((userRole) => userRole.role.name as RoleName);
  }

  private toSummary(user: User, roles: RoleName[]): UserSummary {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      departmentId: user.departmentId,
      roles,
    };
  }

  private toCurrentUser(user: User, roles: RoleName[]): CurrentUser {
    return { ...this.toSummary(user, roles), lastLoginAt: user.lastLoginAt?.toISOString() ?? null };
  }
}
