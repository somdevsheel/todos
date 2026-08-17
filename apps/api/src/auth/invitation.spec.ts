import { hashToken } from "./token.util";
import { DomainNotAllowedException, InvitationExpiredException, InvitationInvalidException } from "../common/exceptions/app.exception";
import { createAuthService } from "./auth.test-utils";

describe("AuthService invitation flow", () => {
  it("rejects inviting an email outside the allowed company domain", async () => {
    const { authService } = createAuthService();
    await expect(
      authService.invite(
        { sub: "admin-1", organizationId: "org-1" },
        { email: "employee@gmail.com", firstName: "A", lastName: "B", role: "EMPLOYEE" },
      ),
    ).rejects.toBeInstanceOf(DomainNotAllowedException);
  });

  it("creates a PENDING_INVITE user, a Role assignment, and an Invitation row, then emails the invite", async () => {
    const { authService, prisma, mailerService, auditService } = createAuthService();
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: "role-employee", name: "EMPLOYEE" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // no existing user with this email
    (prisma.organization.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "org-1", name: "Arutech Consultancy Services LLP" });

    const txUser = { id: "user-new", email: "new.hire@arutechconsultancy.com", status: "PENDING_INVITE" };
    const txInvitation = { id: "invitation-1" };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue(txUser), update: jest.fn() },
        userRole: { upsert: jest.fn().mockResolvedValue({}) },
        teamMember: { upsert: jest.fn() },
        invitation: { create: jest.fn().mockResolvedValue(txInvitation) },
      };
      return fn(tx);
    });

    const result = await authService.invite(
      { sub: "admin-1", organizationId: "org-1" },
      { email: "New.Hire@ArutechConsultancy.com", firstName: "New", lastName: "Hire", role: "EMPLOYEE" },
    );

    expect(result.id).toBe("user-new");
    expect(mailerService.send).toHaveBeenCalledWith(expect.objectContaining({ to: "new.hire@arutechconsultancy.com" }));
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "USER_INVITED" }));
  });

  it("rejects accept-invitation with an invalid (unknown) token", async () => {
    const { authService, prisma } = createAuthService();
    (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.acceptInvitation({ token: "not-a-real-token", password: "correct-password-1" }, {}),
    ).rejects.toBeInstanceOf(InvitationInvalidException);
  });

  it("rejects accept-invitation with an already-accepted token", async () => {
    const { authService, prisma } = createAuthService();
    (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
      id: "inv-1",
      status: "ACCEPTED",
      tokenHash: hashToken("some-token"),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await expect(authService.acceptInvitation({ token: "some-token", password: "correct-password-1" }, {})).rejects.toBeInstanceOf(
      InvitationInvalidException,
    );
  });

  it("rejects accept-invitation with an expired token and marks it EXPIRED", async () => {
    const { authService, prisma } = createAuthService();
    (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      tokenHash: hashToken("some-token"),
      expiresAt: new Date(Date.now() - 1000),
    });
    (prisma.invitation.update as jest.Mock).mockResolvedValue({});

    await expect(authService.acceptInvitation({ token: "some-token", password: "correct-password-1" }, {})).rejects.toBeInstanceOf(
      InvitationExpiredException,
    );
    expect(prisma.invitation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "EXPIRED" } }));
  });

  it("accepts a valid invitation: activates the user and returns an auth session", async () => {
    const { authService, prisma } = createAuthService();
    const invitation = {
      id: "inv-1",
      organizationId: "org-1",
      email: "new.hire@arutechconsultancy.com",
      status: "PENDING",
      tokenHash: hashToken("valid-token"),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(invitation);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-new",
      organizationId: "org-1",
      email: invitation.email,
      firstName: "New",
      lastName: "Hire",
      status: "PENDING_INVITE",
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      { id: "user-new", organizationId: "org-1", email: invitation.email, firstName: "New", lastName: "Hire", status: "ACTIVE" },
      { id: "inv-1", status: "ACCEPTED" },
    ]);
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: { name: "EMPLOYEE" } }]);
    (prisma.session.create as jest.Mock).mockResolvedValue({});

    const result = await authService.acceptInvitation({ token: "valid-token", password: "correct-password-1" }, {});

    expect(result.user.email).toBe(invitation.email);
    expect(result.user.roles).toEqual(["EMPLOYEE"]);
    expect(result.accessToken).toBe("signed.jwt.token");
  });
});
