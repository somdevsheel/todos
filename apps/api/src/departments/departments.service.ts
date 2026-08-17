import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, type DepartmentSummary } from "@arutech/shared-types";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateDepartmentDto } from "./dto/create-department.dto";
import type { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string): Promise<DepartmentSummary[]> {
    const departments = await this.prisma.department.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    return departments.map(this.toSummary);
  }

  async create(organizationId: string, actorId: string, dto: CreateDepartmentDto): Promise<DepartmentSummary> {
    try {
      const department = await this.prisma.department.create({ data: { organizationId, ...dto } });

      await this.auditService.log({
        organizationId,
        actorUserId: actorId,
        action: AUDIT_ACTIONS.DEPARTMENT_CREATED,
        entityType: "Department",
        entityId: department.id,
        metadata: { name: dto.name },
      });

      return this.toSummary(department);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A department with this name already exists.");
      }
      throw error;
    }
  }

  async update(organizationId: string, id: string, actorId: string, dto: UpdateDepartmentDto): Promise<DepartmentSummary> {
    const existing = await this.prisma.department.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException("Department not found");

    const department = await this.prisma.department.update({ where: { id }, data: dto });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.DEPARTMENT_UPDATED,
      entityType: "Department",
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return this.toSummary(department);
  }

  async remove(organizationId: string, id: string, actorId: string): Promise<void> {
    const existing = await this.prisma.department.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException("Department not found");

    await this.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.DEPARTMENT_DELETED,
      entityType: "Department",
      entityId: id,
    });
  }

  private toSummary = (department: { id: string; organizationId: string; name: string; description: string | null }): DepartmentSummary => ({
    id: department.id,
    organizationId: department.organizationId,
    name: department.name,
    description: department.description,
  });
}
