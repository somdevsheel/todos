import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, type TeamMemberSummary, type TeamSummary } from "@arutech/shared-types";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateTeamDto } from "./dto/create-team.dto";
import type { UpdateTeamDto } from "./dto/update-team.dto";

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string): Promise<TeamSummary[]> {
    const teams = await this.prisma.team.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { members: true } } },
    });
    return teams.map((team) => ({
      id: team.id,
      organizationId: team.organizationId,
      departmentId: team.departmentId,
      name: team.name,
      description: team.description,
      memberCount: team._count.members,
    }));
  }

  async create(organizationId: string, actorId: string, dto: CreateTeamDto): Promise<TeamSummary> {
    try {
      const team = await this.prisma.team.create({ data: { organizationId, ...dto } });

      await this.auditService.log({
        organizationId,
        actorUserId: actorId,
        action: AUDIT_ACTIONS.TEAM_CREATED,
        entityType: "Team",
        entityId: team.id,
        metadata: { name: dto.name },
      });

      return { id: team.id, organizationId, departmentId: team.departmentId, name: team.name, description: team.description, memberCount: 0 };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A team with this name already exists.");
      }
      throw error;
    }
  }

  async update(organizationId: string, id: string, actorId: string, dto: UpdateTeamDto): Promise<TeamSummary> {
    const existing = await this.prisma.team.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException("Team not found");

    const team = await this.prisma.team.update({ where: { id }, data: dto });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.TEAM_UPDATED,
      entityType: "Team",
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return { id: team.id, organizationId, departmentId: team.departmentId, name: team.name, description: team.description };
  }

  async remove(organizationId: string, id: string, actorId: string): Promise<void> {
    const existing = await this.prisma.team.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException("Team not found");

    await this.prisma.team.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.TEAM_DELETED,
      entityType: "Team",
      entityId: id,
    });
  }

  async listMembers(organizationId: string, teamId: string): Promise<TeamMemberSummary[]> {
    await this.assertTeamInOrg(organizationId, teamId);
    const members = await this.prisma.teamMember.findMany({ where: { teamId }, orderBy: { joinedAt: "asc" } });
    return members.map((member) => ({
      id: member.id,
      teamId: member.teamId,
      userId: member.userId,
      joinedAt: member.joinedAt.toISOString(),
    }));
  }

  async addMember(organizationId: string, teamId: string, actorId: string, userId: string): Promise<void> {
    await this.assertTeamInOrg(organizationId, teamId);
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found in this organization");

    await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId },
      update: {},
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.TEAM_MEMBER_ADDED,
      entityType: "Team",
      entityId: teamId,
      metadata: { userId },
    });
  }

  async removeMember(organizationId: string, teamId: string, actorId: string, userId: string): Promise<void> {
    await this.assertTeamInOrg(organizationId, teamId);

    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.TEAM_MEMBER_REMOVED,
      entityType: "Team",
      entityId: teamId,
      metadata: { userId },
    });
  }

  private async assertTeamInOrg(organizationId: string, teamId: string): Promise<void> {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, organizationId, deletedAt: null } });
    if (!team) throw new NotFoundException("Team not found");
  }
}
