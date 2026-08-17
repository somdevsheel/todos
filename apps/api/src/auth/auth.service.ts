import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { User } from "@prisma/client";
import { AUDIT_ACTIONS, type AuthSession, type InvitationPreview, type RoleName } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { AppConfig, JwtConfig } from "../config/configuration";
import { AuditService } from "../audit/audit.service";
import { MailerService } from "../mailer/mailer.service";
import { invitationEmail } from "../mailer/templates/invitation.template";
import { passwordResetEmail } from "../mailer/templates/password-reset.template";
import {
  AccountNotActiveException,
  DomainNotAllowedException,
  InvalidCredentialsException,
  InvitationExpiredException,
  InvitationInvalidException,
  TokenInvalidException,
} from "../common/exceptions/app.exception";
import { EmailDomainService } from "./email-domain.service";
import { generateOpaqueToken, hashToken } from "./token.util";
import { addTtl, ttlToMs } from "./ttl.util";
import type { InviteUserDto } from "./dto/invite-user.dto";
import type { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";

/** Argon2id, tuned to OWASP's minimum-recommended parameters for a web-request-path hash. */
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const INVITATION_TTL = "7d";
const PASSWORD_RESET_TTL = "1h";

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

interface IssuedTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;
  private readonly appConfig: AppConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
    private readonly emailDomainService: EmailDomainService,
    private readonly mailerService: MailerService,
    private readonly auditService: AuditService,
  ) {
    this.jwtConfig = configService.get<JwtConfig>("jwt")!;
    this.appConfig = configService.get<AppConfig>("app")!;
  }

  // ---------------------------------------------------------------------
  // Invitation
  // ---------------------------------------------------------------------

  async invite(
    actor: { sub: string; organizationId: string },
    dto: InviteUserDto,
  ): Promise<{ id: string; email: string; status: string; invitationId: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    if (!this.emailDomainService.isAllowedDomain(normalizedEmail)) {
      throw new DomainNotAllowedException(normalizedEmail);
    }

    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new NotFoundException("Role not found");

    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId: actor.organizationId, email: normalizedEmail } },
    });
    if (existing && existing.status !== "DEACTIVATED") {
      throw new ConflictException("This person has already been invited or already has an account.");
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addTtl(new Date(), INVITATION_TTL);

    const { user, invitation } = await this.prisma.$transaction(async (tx) => {
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              departmentId: dto.departmentId,
              status: "PENDING_INVITE",
              passwordHash: null,
            },
          })
        : await tx.user.create({
            data: {
              organizationId: actor.organizationId,
              email: normalizedEmail,
              firstName: dto.firstName,
              lastName: dto.lastName,
              departmentId: dto.departmentId,
              status: "PENDING_INVITE",
            },
          });

      await tx.userRole.upsert({
        where: { userId_roleId_organizationId: { userId: user.id, roleId: role.id, organizationId: actor.organizationId } },
        create: { userId: user.id, roleId: role.id, organizationId: actor.organizationId, assignedByUserId: actor.sub },
        update: {},
      });

      if (dto.teamId) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: dto.teamId, userId: user.id } },
          create: { teamId: dto.teamId, userId: user.id },
          update: {},
        });
      }

      const invitation = await tx.invitation.create({
        data: {
          organizationId: actor.organizationId,
          email: normalizedEmail,
          roleId: role.id,
          departmentId: dto.departmentId,
          teamId: dto.teamId,
          tokenHash,
          invitedByUserId: actor.sub,
          expiresAt,
        },
      });

      return { user, invitation };
    });

    const [org, inviter] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } }),
      this.prisma.user.findUnique({ where: { id: actor.sub } }),
    ]);

    const acceptUrl = `${this.appConfig.frontendUrl}/register?token=${rawToken}`;
    const { subject, html, text } = invitationEmail({
      recipientEmail: normalizedEmail,
      organizationName: org.name,
      invitedByName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "An admin",
      acceptUrl,
      expiresAt,
    });
    await this.mailerService.send({ to: normalizedEmail, subject, html, text });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.USER_INVITED,
      entityType: "User",
      entityId: user.id,
      metadata: { email: normalizedEmail, role: dto.role },
    });

    return { id: user.id, email: user.email, status: user.status, invitationId: invitation.id };
  }

  async getInvitationPreview(rawToken: string): Promise<InvitationPreview> {
    const invitation = await this.findValidInvitationOrThrow(rawToken);
    const [org, inviter] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } }),
      this.prisma.user.findUnique({ where: { id: invitation.invitedByUserId } }),
      this.prisma.role.findUniqueOrThrow({ where: { id: invitation.roleId } }),
    ]);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { id: invitation.roleId } });

    return {
      email: invitation.email,
      organizationName: org.name,
      role: role.name as RoleName,
      invitedByName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "An admin",
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto, meta: RequestMeta): Promise<AuthSession> {
    const invitation = await this.findValidInvitationOrThrow(dto.token);

    // Defense-in-depth: re-validate domain even though it was checked at invite time.
    if (!this.emailDomainService.isAllowedDomain(invitation.email)) {
      throw new DomainNotAllowedException(invitation.email);
    }

    const user = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId: invitation.organizationId, email: invitation.email } },
    });
    if (!user || user.status === "ACTIVE") throw new InvitationInvalidException();

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          status: "ACTIVE",
          firstName: dto.firstName?.trim() || user.firstName,
          lastName: dto.lastName?.trim() || user.lastName,
          lastLoginAt: new Date(),
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
    ]);

    const roles = await this.getUserRoleNames(updatedUser.id, updatedUser.organizationId);
    const tokens = await this.issueTokenPair(updatedUser, roles, meta);

    await this.auditService.log({
      organizationId: updatedUser.organizationId,
      actorUserId: updatedUser.id,
      action: AUDIT_ACTIONS.USER_ACTIVATED,
      entityType: "User",
      entityId: updatedUser.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.buildAuthSession(updatedUser, roles, tokens);
  }

  private async findValidInvitationOrThrow(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    if (!invitation) throw new InvitationInvalidException();
    if (invitation.status === "ACCEPTED" || invitation.status === "REVOKED") {
      throw new InvitationInvalidException();
    }
    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
      if (invitation.status !== "EXPIRED") {
        await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
      }
      throw new InvitationExpiredException();
    }
    return invitation;
  }

  // ---------------------------------------------------------------------
  // Login / refresh / logout
  // ---------------------------------------------------------------------

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthSession> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    if (!this.emailDomainService.isAllowedDomain(normalizedEmail)) {
      await this.auditService.log({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: "User",
        metadata: { email: normalizedEmail, reason: "domain_not_allowed" },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    // Email is unique per-organization (see DATABASE.md); findFirst is
    // correct today because the domain restriction means there is
    // effectively one organization in practice. Revisit if/when multiple
    // organizations share overlapping user bases.
    const user = await this.prisma.user.findFirst({ where: { email: normalizedEmail, deletedAt: null } });

    if (!user || !user.passwordHash) {
      await this.auditService.log({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: "User",
        metadata: { email: normalizedEmail, reason: "not_found" },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.auditService.log({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: "User",
        entityId: user.id,
        metadata: { reason: "bad_password" },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new InvalidCredentialsException();
    }

    if (user.status !== "ACTIVE") {
      await this.auditService.log({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: "User",
        entityId: user.id,
        metadata: { reason: "not_active", status: user.status },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AccountNotActiveException();
    }

    const roles = await this.getUserRoleNames(user.id, user.organizationId);
    const tokens = await this.issueTokenPair(user, roles, meta);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await this.auditService.log({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.buildAuthSession(user, roles, tokens);
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthSession> {
    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash }, include: { user: true } });

    if (!session) throw new TokenInvalidException("Invalid refresh token.");

    if (session.revokedAt) {
      // The token was already rotated (or logged out) once before — reuse
      // is a strong signal of token theft. Kill every session for this
      // user rather than trusting the presenter.
      await this.revokeAllSessions(session.userId);
      await this.auditService.log({
        organizationId: session.user.organizationId,
        actorUserId: session.userId,
        action: AUDIT_ACTIONS.SECURITY_REFRESH_REUSE_DETECTED,
        entityType: "Session",
        entityId: session.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new TokenInvalidException("This session is no longer valid. Please sign in again.");
    }

    if (session.expiresAt < new Date()) {
      throw new TokenInvalidException("Your session has expired. Please sign in again.");
    }
    if (session.user.status !== "ACTIVE") {
      throw new AccountNotActiveException();
    }

    // Rotate: revoke the presented session, issue a brand new one.
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

    const roles = await this.getUserRoleNames(session.userId, session.user.organizationId);
    const tokens = await this.issueTokenPair(session.user, roles, meta);

    return this.buildAuthSession(session.user, roles, tokens);
  }

  async logout(userId: string, refreshToken: string | undefined, meta: RequestMeta): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await this.prisma.session.updateMany({
        where: { userId, refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.auditService.log({
      actorUserId: userId,
      action: AUDIT_ACTIONS.USER_LOGOUT,
      entityType: "User",
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async logoutAll(userId: string, meta: RequestMeta): Promise<void> {
    await this.revokeAllSessions(userId);
    await this.auditService.log({
      actorUserId: userId,
      action: AUDIT_ACTIONS.USER_LOGOUT_ALL,
      entityType: "User",
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  // ---------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto, meta: RequestMeta): Promise<void> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null, status: "ACTIVE" },
    });

    // Always behave identically whether or not the account exists —
    // no user-enumeration signal in the HTTP response.
    if (!user) return;

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addTtl(new Date(), PASSWORD_RESET_TTL);

    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const resetUrl = `${this.appConfig.frontendUrl}/reset-password?token=${rawToken}`;
    const { subject, html, text } = passwordResetEmail({ recipientName: user.firstName, resetUrl, expiresAt });
    await this.mailerService.send({ to: user.email, subject, html, text });

    await this.auditService.log({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async resetPassword(dto: ResetPasswordDto, meta: RequestMeta): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new TokenInvalidException();
    }

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Force re-login everywhere after a password reset.
      this.prisma.session.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await this.auditService.log({
      organizationId: resetToken.user.organizationId,
      actorUserId: resetToken.userId,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      entityType: "User",
      entityId: resetToken.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  // ---------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------

  private async getUserRoleNames(userId: string, organizationId: string): Promise<RoleName[]> {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId, organizationId }, include: { role: true } });
    return userRoles.map((userRole) => userRole.role.name as RoleName);
  }

  private async issueTokenPair(
    user: Pick<User, "id" | "email" | "organizationId">,
    roles: RoleName[],
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const now = new Date();
    const accessTokenExpiresAt = addTtl(now, this.jwtConfig.accessTtl);
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, organizationId: user.organizationId, roles },
      // jsonwebtoken's expiresIn accepts a template-literal "StringValue"
      // type it doesn't export cleanly for reuse here, so this converts
      // our own "15m"/"30d"-style config strings to seconds instead.
      { secret: this.jwtConfig.accessSecret, expiresIn: Math.floor(ttlToMs(this.jwtConfig.accessTtl) / 1000) },
    );

    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenExpiresAt = addTtl(now, this.jwtConfig.refreshTtl);
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(rawRefreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    };
  }

  private buildAuthSession(user: User, roles: RoleName[], tokens: IssuedTokens): AuthSession {
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        organizationId: user.organizationId,
      },
    };
  }
}
