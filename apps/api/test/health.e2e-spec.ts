import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health reports database and redis as up when the dev stack is running", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");

    expect(res.status).toBe(200);
    // Every successful response is wrapped in the standard {success,data}
    // envelope by TransformInterceptor — see common/interceptors.
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.info.database.status).toBe("up");
    expect(res.body.data.info.redis.status).toBe("up");
  });

  it("is reachable without an Authorization header (public route)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health").unset("Authorization");
    expect(res.status).not.toBe(401);
  });
});
