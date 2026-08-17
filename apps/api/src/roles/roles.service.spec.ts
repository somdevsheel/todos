import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import { RolesService } from "./roles.service";

const ACTOR: AuthenticatedUser = { sub: "user-1", email: "somdev@arutechconsultancy.com", organizationId: "org-1", roles: ["SUPER_ADMIN"] };

function createRolesService() {
  const findUnique = jest.fn();
  const count = jest.fn();
  const deleteMany = jest.fn();
  const createMany = jest.fn();
  const transaction = jest.fn((ops: unknown[]) => Promise.all(ops));

  const prisma = {
    role: { findUnique, findMany: jest.fn() },
    permission: { count },
    rolePermission: { deleteMany, createMany },
    $transaction: transaction,
  } as unknown as PrismaService;

  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const service = new RolesService(prisma, auditService);

  return { service, findUnique, count, deleteMany, createMany, auditService };
}

describe("RolesService.updateRolePermissions", () => {
  it("rejects an unknown permission id", async () => {
    const { service, findUnique, count } = createRolesService();
    findUnique.mockResolvedValue({ id: "role-1", name: "ADMIN", description: null, isSystem: true });
    count.mockResolvedValue(1); // only 1 of 2 requested ids actually exist

    await expect(service.updateRolePermissions("role-1", ["perm-1", "perm-2"], ACTOR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws NotFound for an unknown role", async () => {
    const { service, findUnique } = createRolesService();
    findUnique.mockResolvedValue(null);

    await expect(service.updateRolePermissions("bogus", [], ACTOR)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("replaces the full permission set via delete-then-recreate and audits the change", async () => {
    const { service, findUnique, count, deleteMany, createMany, auditService } = createRolesService();
    findUnique.mockResolvedValue({ id: "role-1", name: "MANAGER", description: null, isSystem: true });
    count.mockResolvedValue(2);

    const result = await service.updateRolePermissions("role-1", ["perm-1", "perm-2"], ACTOR);

    expect(deleteMany).toHaveBeenCalledWith({ where: { roleId: "role-1" } });
    expect(createMany).toHaveBeenCalledWith({ data: [{ roleId: "role-1", permissionId: "perm-1" }, { roleId: "role-1", permissionId: "perm-2" }] });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ROLE_PERMISSIONS_UPDATED", entityId: "role-1" }));
    expect(result.permissionIds).toEqual(["perm-1", "perm-2"]);
  });

  it("allows clearing every permission from a role (empty array)", async () => {
    const { service, findUnique, count, deleteMany, createMany } = createRolesService();
    findUnique.mockResolvedValue({ id: "role-1", name: "EMPLOYEE", description: null, isSystem: true });

    await service.updateRolePermissions("role-1", [], ACTOR);

    expect(count).not.toHaveBeenCalled(); // nothing to validate when the list is empty
    expect(deleteMany).toHaveBeenCalledWith({ where: { roleId: "role-1" } });
    expect(createMany).toHaveBeenCalledWith({ data: [] });
  });
});
