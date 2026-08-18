import { envSchema, validateEnv } from "./env.schema";

/**
 * Minimal set of required vars (no optional/defaulted ones) — every test
 * below starts from this and overrides only what it's actually testing,
 * so a future new required var only needs updating in one place.
 */
const BASE_ENV: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "dev-only-access-secret-change-me-please-32chars-min",
  JWT_REFRESH_SECRET: "dev-only-refresh-secret-change-me-please-32chars-min",
  ALLOWED_EMAIL_DOMAINS: "arutechconsultancy.com",
  CORS_ORIGINS: "http://localhost:3000",
  SMTP_HOST: "localhost",
  SMTP_FROM_EMAIL: "no-reply@arutechconsultancy.com",
};

describe("envSchema — STORAGE_PROVIDER=s3 validation", () => {
  it("passes without any STORAGE_* vars when STORAGE_PROVIDER is left at its default (local)", () => {
    expect(() => validateEnv(BASE_ENV)).not.toThrow();
  });

  it("fails at bootstrap, not later, when STORAGE_PROVIDER=s3 is selected with none of the four required vars set", () => {
    expect(() => validateEnv({ ...BASE_ENV, STORAGE_PROVIDER: "s3" })).toThrow();

    const result = envSchema.safeParse({ ...BASE_ENV, STORAGE_PROVIDER: "s3" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining(["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"]),
      );
    }
  });

  it.each(["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"])(
    "reports specifically on %s when only it is missing",
    (missingKey) => {
      const allSet: Record<string, string> = {
        ...BASE_ENV,
        STORAGE_PROVIDER: "s3",
        STORAGE_ENDPOINT: "https://s3.example.com",
        STORAGE_BUCKET: "arutech-uploads",
        STORAGE_ACCESS_KEY: "AKIA_FAKE",
        STORAGE_SECRET_KEY: "fake-secret",
      };
      delete allSet[missingKey];

      const result = envSchema.safeParse(allSet);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((i) => i.path.join("."))).toEqual([missingKey]);
        expect(result.error.issues[0].message).toBe(`${missingKey} is required when STORAGE_PROVIDER=s3`);
      }
    },
  );

  it("passes when STORAGE_PROVIDER=s3 and all four vars are set", () => {
    expect(() =>
      validateEnv({
        ...BASE_ENV,
        STORAGE_PROVIDER: "s3",
        STORAGE_ENDPOINT: "https://s3.example.com",
        STORAGE_BUCKET: "arutech-uploads",
        STORAGE_ACCESS_KEY: "AKIA_FAKE",
        STORAGE_SECRET_KEY: "fake-secret",
      }),
    ).not.toThrow();
  });
});
