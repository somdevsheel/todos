/**
 * Development seed data ONLY. Never run against a production database —
 * it creates fake employees with a well-known password so you can log in
 * locally. See README.md "Seed data" for the full list of accounts this
 * creates and SECURITY.md for why this must never touch production.
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
const DEV_PASSWORD = "ArutechDev#2026";

const ORG = {
  name: "Arutech Consultancy Services LLP",
  slug: "arutech-consultancy-services-llp",
  domain: "arutechconsultancy.com",
};

const ROLES: Array<{ name: string; description: string }> = [
  { name: "SUPER_ADMIN", description: "Full system access." },
  { name: "ADMIN", description: "Manages employees, teams, departments, tasks, events, and settings." },
  { name: "MANAGER", description: "Creates and assigns tasks/events, manages team work." },
  { name: "EMPLOYEE", description: "Views assigned work, chats, participates in events." },
];

const PERMISSIONS: string[] = [
  "users:read",
  "users:write",
  "audit:read",
  "organization:write",
];

const DEPARTMENTS = ["Development", "AI & ML", "Operations", "Management"];

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
}

const SEED_USERS: SeedUser[] = [
  { email: "hello@arutechconsultancy.com", firstName: "Somdev", lastName: "Sheel", role: "SUPER_ADMIN", department: "Management" },
  { email: "priya.admin@arutechconsultancy.com", firstName: "Priya", lastName: "Sharma", role: "ADMIN", department: "Operations" },
  { email: "kajal.manager@arutechconsultancy.com", firstName: "Kajal", lastName: "Verma", role: "MANAGER", department: "Development" },
  { email: "rahul.dev@arutechconsultancy.com", firstName: "Rahul", lastName: "Iyer", role: "EMPLOYEE", department: "Development" },
  { email: "anita.ml@arutechconsultancy.com", firstName: "Anita", lastName: "Rao", role: "EMPLOYEE", department: "AI & ML" },
];

async function main(): Promise<void> {
  console.log("Seeding Arutech Workspace development data...");

  const organization = await prisma.organization.upsert({
    where: { slug: ORG.slug },
    update: {},
    create: ORG,
  });

  const roleByName = new Map<string, { id: string }>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description, isSystem: true },
    });
    roleByName.set(role.name, created);
  }

  const permissionByKey = new Map<string, { id: string }>();
  for (const key of PERMISSIONS) {
    const created = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
    permissionByKey.set(key, created);
  }

  // Minimal starter mapping — SUPER_ADMIN and ADMIN get everything seeded.
  // As of Phase 7, RolePermission is API-editable (PATCH /roles/:id/permissions,
  // see DATABASE.md), but this seed data is still just the starting point —
  // no guard reads Permission/RolePermission yet, so this mapping doesn't
  // gate anything on its own.
  for (const roleName of ["SUPER_ADMIN", "ADMIN"]) {
    const role = roleByName.get(roleName)!;
    for (const permission of permissionByKey.values()) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const departmentByName = new Map<string, { id: string }>();
  for (const name of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: organization.id, name } },
      update: {},
      create: { organizationId: organization.id, name },
    });
    departmentByName.set(name, created);
  }

  const passwordHash = await argon2.hash(DEV_PASSWORD, ARGON2_OPTIONS);

  for (const seedUser of SEED_USERS) {
    const department = departmentByName.get(seedUser.department);
    const role = roleByName.get(seedUser.role)!;

    const user = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: organization.id, email: seedUser.email } },
      update: {},
      create: {
        organizationId: organization.id,
        email: seedUser.email,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        departmentId: department?.id,
        status: "ACTIVE",
        passwordHash,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId_organizationId: { userId: user.id, roleId: role.id, organizationId: organization.id } },
      update: {},
      create: { userId: user.id, roleId: role.id, organizationId: organization.id },
    });
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Dev accounts (all use the same password — DEV ONLY, never in production):");
  console.log(`  password: ${DEV_PASSWORD}`);
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(11)} ${u.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
