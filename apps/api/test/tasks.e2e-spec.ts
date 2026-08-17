import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Full task loop against a real Postgres (see docker/docker-compose.dev.yml)
 * — create with an assignee, verify the real TASK_ASSIGNED notification,
 * comment with an @mention, verify both the participant and the mentioned
 * user's notifications, complete the task, verify the audit trail, and a
 * genuine multipart file upload/download/delete round trip.
 *
 * Requires the seeded dev users (see prisma/seed.ts) to already exist —
 * `pnpm docker:dev:up && pnpm prisma:migrate && pnpm prisma:seed` first.
 */
describe("Tasks flow (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let employee1Token: string;
  let employee1Id: string;
  let employee2Token: string;
  let employee2Id: string;

  const createdTaskIds: string[] = [];
  const createdFileIds: string[] = [];

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    return res.body.data as { accessToken: string; user: { id: string } };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    prisma = app.get(PrismaService);

    const manager = await login("kajal.manager@arutechconsultancy.com", "ArutechDev#2026");
    managerToken = manager.accessToken;
    const employee1 = await login("rahul.dev@arutechconsultancy.com", "ArutechDev#2026");
    employee1Token = employee1.accessToken;
    employee1Id = employee1.user.id;
    const employee2 = await login("anita.ml@arutechconsultancy.com", "ArutechDev#2026");
    employee2Token = employee2.accessToken;
    employee2Id = employee2.user.id;
  });

  afterAll(async () => {
    // Hard-delete test-created rows (soft-delete is the right behavior for
    // the app itself — see DATABASE.md — but this is disposable e2e fixture
    // data, not a real business record worth preserving across test runs).
    if (createdTaskIds.length) await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    if (createdFileIds.length) await prisma.file.deleteMany({ where: { id: { in: createdFileIds } } });
    await app.close();
  });

  it("runs the full create -> assign -> notify -> comment -> mention -> complete -> audit loop", async () => {
    const create = await request(app.getHttpServer())
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ title: "E2E Complete API Integration", priority: "HIGH", assigneeUserIds: [employee1Id] });
    expect(create.status).toBe(201);
    const taskId = create.body.data.id as string;
    createdTaskIds.push(taskId);

    const employee1Notifications = await request(app.getHttpServer())
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${employee1Token}`);
    expect(
      employee1Notifications.body.data.items.some(
        (n: { type: string; data: { taskId: string } }) => n.type === "TASK_ASSIGNED" && n.data.taskId === taskId,
      ),
    ).toBe(true);

    const comment = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ body: "Please double check this", mentionedUserIds: [employee2Id] });
    expect(comment.status).toBe(201);

    const employee2Notifications = await request(app.getHttpServer())
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${employee2Token}`);
    expect(
      employee2Notifications.body.data.items.some((n: { type: string }) => n.type === "TASK_MENTIONED"),
    ).toBe(true);

    const employee1NotificationsAfterComment = await request(app.getHttpServer())
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${employee1Token}`);
    expect(
      employee1NotificationsAfterComment.body.data.items.some((n: { type: string }) => n.type === "TASK_COMMENTED"),
    ).toBe(true);

    const complete = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${employee1Token}`)
      .send({ status: "COMPLETED" });
    expect(complete.status).toBe(200);
    expect(complete.body.data.status).toBe("COMPLETED");
    expect(complete.body.data.completedAt).toBeTruthy();

    const auditRows = await prisma.auditLog.findMany({ where: { entityId: taskId }, orderBy: { createdAt: "asc" } });
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["TASK_CREATED", "TASK_COMMENT_CREATED", "TASK_COMPLETED"]),
    );
  });

  it("rejects an employee assigning a task to someone else", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${employee1Token}`)
      .send({ title: "Should be rejected", assigneeUserIds: [employee2Id] });
    expect(res.status).toBe(403);
  });

  it("uploads a real file, attaches it to a task, downloads it back byte-for-byte, then deletes it", async () => {
    const create = await request(app.getHttpServer())
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${employee1Token}`)
      .send({ title: "E2E task with an attachment" });
    expect(create.status).toBe(201);
    const taskId = create.body.data.id as string;
    createdTaskIds.push(taskId);

    const fileContents = Buffer.from("Arutech Workspace e2e test file contents");
    const upload = await request(app.getHttpServer())
      .post("/api/v1/files")
      .set("Authorization", `Bearer ${employee1Token}`)
      .attach("file", fileContents, { filename: "notes.txt", contentType: "text/plain" });
    expect(upload.status).toBe(201);
    const fileId = upload.body.data.id as string;
    createdFileIds.push(fileId);

    const attach = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set("Authorization", `Bearer ${employee1Token}`)
      .send({ fileId });
    expect(attach.status).toBe(201);

    const download = await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}`)
      .set("Authorization", `Bearer ${employee1Token}`);
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toContain("text/plain");
    // superagent (supertest's client) parses a text/plain response into
    // `.text`, not a raw `.body` Buffer — this is still a genuine
    // byte-for-byte check of what came back over the wire.
    expect(download.text).toBe(fileContents.toString("utf-8"));

    const remove = await request(app.getHttpServer())
      .delete(`/api/v1/files/${fileId}`)
      .set("Authorization", `Bearer ${employee1Token}`);
    expect(remove.status).toBe(200);
  });

  it("rejects an upload with no file attached", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/files").set("Authorization", `Bearer ${employee1Token}`);
    expect(res.status).toBe(400);
  });
});
