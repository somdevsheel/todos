import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { DeepMockProxy } from "./test-types";
import { AuthService } from "./auth.service";
import { EmailDomainService } from "./email-domain.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { MailerService } from "../mailer/mailer.service";
import type { AuditService } from "../audit/audit.service";

/**
 * Shared test scaffolding for auth.service.spec.ts / invitation.spec.ts /
 * refresh-token.spec.ts — all three exercise the same AuthService against
 * different flows, so the mock wiring lives in one place.
 */
export function createTestConfigService(): ConfigService {
  const config: Record<string, unknown> = {
    jwt: { accessSecret: "test-access-secret", accessTtl: "15m", refreshSecret: "test-refresh-secret", refreshTtl: "30d" },
    app: { nodeEnv: "test", port: 4000, globalPrefix: "api/v1", timezone: "Asia/Kolkata", isProduction: false, frontendUrl: "http://localhost:3000" },
    auth: { allowedEmailDomains: ["arutechconsultancy.com"] },
  };
  return { get: jest.fn((key: string) => config[key]) } as unknown as ConfigService;
}

export function createMockPrisma(): DeepMockProxy<PrismaService> {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  });

  return {
    user: model(),
    role: model(),
    permission: model(),
    rolePermission: model(),
    userRole: model(),
    invitation: model(),
    session: model(),
    passwordResetToken: model(),
    organization: model(),
    department: model(),
    team: model(),
    teamMember: model(),
    auditLog: model(),
    notification: model(),
    userDevice: model(),
    $transaction: jest.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === "function") return arg(createMockPrisma());
      return arg;
    }),
    $queryRaw: jest.fn(),
  } as unknown as DeepMockProxy<PrismaService>;
}

export function createAuthService(overrides?: { prisma?: DeepMockProxy<PrismaService> }) {
  const prisma = overrides?.prisma ?? createMockPrisma();
  const jwtService = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") } as unknown as JwtService;
  const configService = createTestConfigService();
  const emailDomainService = new EmailDomainService(configService);
  const mailerService = { send: jest.fn().mockResolvedValue(undefined) } as unknown as MailerService;
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

  const authService = new AuthService(
    prisma as unknown as PrismaService,
    jwtService,
    configService,
    emailDomainService,
    mailerService,
    auditService,
  );

  return { authService, prisma, jwtService, configService, emailDomainService, mailerService, auditService };
}
