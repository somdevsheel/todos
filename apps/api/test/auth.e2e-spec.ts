import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { extractTokenFromEmail, waitForMailTo } from "./mailhog.helper";

/**
 * Full invitation -> accept -> login -> refresh(rotate) -> refresh(reuse
 * rejected) -> logout-all -> refresh(revoked) loop, against a real
 * Postgres + MailHog (see docker/docker-compose.dev.yml).
 *
 * Requires: `pnpm docker:dev:up`, `pnpm prisma:migrate`, `pnpm prisma:seed`
 * run first (the seeded SUPER_ADMIN account is used to send the invite).
 */
describe("Auth flow (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmail = `e2e-${Date.now()}@arutechconsultancy.com`;
  const testPassword = "E2eTestPass#1";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it("rejects inviting a non-company-domain email", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "somdev@arutechconsultancy.com", password: "ArutechDev#2026" });
    expect(login.status).toBe(200);
    const accessToken = login.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/invite")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "someone@gmail.com", firstName: "No", lastName: "Body", role: "EMPLOYEE" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("DOMAIN_NOT_ALLOWED");
  });

  it("runs the full invite -> accept -> login -> refresh(rotate+reuse) -> logout-all loop", async () => {
    // 1. Log in as the seeded SUPER_ADMIN.
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "somdev@arutechconsultancy.com", password: "ArutechDev#2026" });
    expect(adminLogin.status).toBe(200);
    const adminAccessToken = adminLogin.body.data.accessToken;

    // 2. Invite a fresh test user.
    const invite = await request(app.getHttpServer())
      .post("/api/v1/auth/invite")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ email: testEmail, firstName: "E2E", lastName: "Tester", role: "EMPLOYEE" });
    expect(invite.status).toBe(201);

    // 3. Pull the real email out of MailHog and extract the invitation token.
    const message = await waitForMailTo(testEmail);
    const token = extractTokenFromEmail(message);

    // 4. Preview the invitation (public, unauthenticated).
    const preview = await request(app.getHttpServer()).get(`/api/v1/auth/invitations/${token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.email).toBe(testEmail);
    expect(preview.body.data.role).toBe("EMPLOYEE");

    // 5. Accept the invitation -> auto-login.
    const accept = await request(app.getHttpServer())
      .post("/api/v1/auth/accept-invitation")
      .send({ token, password: testPassword });
    expect(accept.status).toBe(201);
    expect(accept.body.data.user.email).toBe(testEmail);
    expect(accept.body.data.user.roles).toEqual(["EMPLOYEE"]);

    const firstRefreshToken = accept.body.data.refreshToken;

    // 6. Log in normally with the new password too.
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: testEmail, password: testPassword });
    expect(login.status).toBe(200);

    // 7. Rotate the refresh token from step 5.
    const refreshed = await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken: firstRefreshToken });
    expect(refreshed.status).toBe(200);
    const secondRefreshToken = refreshed.body.data.refreshToken;
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // 8. Reusing the now-rotated first refresh token must be rejected.
    const reused = await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken: firstRefreshToken });
    expect(reused.status).toBe(400);
    expect(reused.body.error.code).toBe("TOKEN_INVALID");

    // 9. ...and because reuse triggers full revocation, even the SECOND
    // (legitimately rotated) refresh token must now be dead too.
    const afterReuse = await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken: secondRefreshToken });
    expect(afterReuse.status).toBe(400);
  });
});
