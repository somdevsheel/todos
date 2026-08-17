import * as argon2 from "argon2";
import { AccountNotActiveException, InvalidCredentialsException } from "../common/exceptions/app.exception";
import { createAuthService } from "./auth.test-utils";

const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

describe("AuthService.login", () => {
  it("rejects an email outside the allowed company domain with a generic error", async () => {
    const { authService, prisma, auditService } = createAuthService();
    await expect(authService.login({ email: "employee@gmail.com", password: "whatever1" }, {})).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ reason: "domain_not_allowed" }) }));
  });

  it("rejects an unknown email with the same generic error as a wrong password (no user enumeration)", async () => {
    const { authService, prisma } = createAuthService();
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.login({ email: "nobody@arutechconsultancy.com", password: "whatever1" }, {}),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it("rejects a correct email with the wrong password", async () => {
    const { authService, prisma } = createAuthService();
    const passwordHash = await argon2.hash("correct-password-1", ARGON2_OPTIONS);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      email: "rahul@arutechconsultancy.com",
      passwordHash,
      status: "ACTIVE",
    });

    await expect(
      authService.login({ email: "rahul@arutechconsultancy.com", password: "wrong-password" }, {}),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it("rejects a correct password for a non-ACTIVE (e.g. PENDING_INVITE) account", async () => {
    const { authService, prisma } = createAuthService();
    const passwordHash = await argon2.hash("correct-password-1", ARGON2_OPTIONS);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      email: "rahul@arutechconsultancy.com",
      passwordHash,
      status: "PENDING_INVITE",
    });

    await expect(
      authService.login({ email: "rahul@arutechconsultancy.com", password: "correct-password-1" }, {}),
    ).rejects.toBeInstanceOf(AccountNotActiveException);
  });

  it("succeeds for a correct password + ACTIVE account, issuing a token pair and a Session row", async () => {
    const { authService, prisma, jwtService } = createAuthService();
    const passwordHash = await argon2.hash("correct-password-1", ARGON2_OPTIONS);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      email: "rahul@arutechconsultancy.com",
      firstName: "Rahul",
      lastName: "Iyer",
      passwordHash,
      status: "ACTIVE",
    });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ role: { name: "EMPLOYEE" } }]);
    (prisma.session.create as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const result = await authService.login({ email: "rahul@arutechconsultancy.com", password: "correct-password-1" }, {});

    expect(result.user.roles).toEqual(["EMPLOYEE"]);
    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(jwtService.signAsync).toHaveBeenCalled();
    expect(prisma.session.create).toHaveBeenCalled();
  });
});
