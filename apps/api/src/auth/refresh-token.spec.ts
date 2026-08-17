import { TokenInvalidException } from "../common/exceptions/app.exception";
import { createAuthService } from "./auth.test-utils";

describe("AuthService.refresh", () => {
  it("rejects a refresh token that doesn't match any session", async () => {
    const { authService, prisma } = createAuthService();
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(authService.refresh("unknown-token", {})).rejects.toBeInstanceOf(TokenInvalidException);
  });

  it("rotates a valid, unexpired, unrevoked session into a brand new token pair", async () => {
    const { authService, prisma } = createAuthService();
    const session = {
      id: "session-1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: "user-1", organizationId: "org-1", email: "rahul@arutechconsultancy.com", status: "ACTIVE" },
    };
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(session);
    (prisma.session.update as jest.Mock).mockResolvedValue({});
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: { name: "EMPLOYEE" } }]);
    (prisma.session.create as jest.Mock).mockResolvedValue({});

    const result = await authService.refresh("some-valid-refresh-token", {});

    // The presented session must be revoked (rotation), and a new one created.
    expect(prisma.session.update).toHaveBeenCalledWith({ where: { id: "session-1" }, data: { revokedAt: expect.any(Date) } });
    expect(prisma.session.create).toHaveBeenCalled();
    expect(result.accessToken).toBe("signed.jwt.token");
  });

  it("treats a REUSED (already-revoked) refresh token as compromised: revokes the whole session family", async () => {
    const { authService, prisma, auditService } = createAuthService();
    const session = {
      id: "session-1",
      userId: "user-1",
      revokedAt: new Date(), // already rotated once before — this is a reuse
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: "user-1", organizationId: "org-1", email: "rahul@arutechconsultancy.com", status: "ACTIVE" },
    };
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(session);
    (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

    await expect(authService.refresh("stolen-and-reused-token", {})).rejects.toBeInstanceOf(TokenInvalidException);

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "SECURITY_REFRESH_REUSE_DETECTED" }));
  });

  it("rejects an expired session even if it was never explicitly revoked", async () => {
    const { authService, prisma } = createAuthService();
    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "user-1", organizationId: "org-1", status: "ACTIVE" },
    });

    await expect(authService.refresh("expired-token", {})).rejects.toBeInstanceOf(TokenInvalidException);
  });
});
