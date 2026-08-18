import { z } from "zod";

/**
 * Single source of truth for environment validation. NestJS's ConfigModule
 * runs this synchronously at bootstrap (see config.module.ts) — a missing
 * or malformed required variable throws before the HTTP listener starts,
 * so misconfiguration fails loudly at deploy time instead of silently at
 * request time.
 */
const boolFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const csvList = (min = 1) =>
  z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(min));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    API_GLOBAL_PREFIX: z.string().default("api/v1"),
    APP_TIMEZONE: z.string().default("Asia/Kolkata"),
    // Used to build invitation / password-reset links that point at the web app.
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_REFRESH_TTL: z.string().default("30d"),

    ALLOWED_EMAIL_DOMAINS: csvList(1),
    CORS_ORIGINS: csvList(1),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: boolFromString,
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASSWORD: z.string().optional().default(""),
    SMTP_FROM_NAME: z.string().default("Arutech Workspace"),
    SMTP_FROM_EMAIL: z.string().email(),

    THROTTLE_TTL: z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),
    AUTH_THROTTLE_TTL: z.coerce.number().int().positive().default(60),
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),

    // Phase 4 — reserved, unused until FCM integration lands.
    FCM_PROJECT_ID: z.string().optional(),
    FCM_CLIENT_EMAIL: z.string().optional(),
    FCM_PRIVATE_KEY: z.string().optional(),

    // File storage (Phase 2): local-disk today; STORAGE_PROVIDER="s3" is
    // reserved for a later swap-in — see files/storage/storage.module.ts.
    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./uploads"),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10),
    ALLOWED_UPLOAD_MIME_TYPES: csvList(1).default(
      "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv," +
        "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
        "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),

    // Consumed by files/storage/s3.storage.ts when STORAGE_PROVIDER=s3 —
    // required in that case (checked below), unused/optional otherwise.
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
    // NOT in the required-when-s3 list below, unlike the four above — most
    // S3-compatible servers ignore region entirely, so requiring it would
    // break that legitimate case. S3StorageProvider logs a clear warning
    // (not silence) when it's left unset — see its docstring for why real
    // AWS S3 specifically needs this set correctly.
    STORAGE_REGION: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Applies in every environment, not just production — an operator who
    // sets STORAGE_PROVIDER=s3 without the four vars it needs should find
    // out at boot, not on the first upload (same "fail loud at startup"
    // principle as StorageModule/S3StorageProvider's own checks — this is
    // the earliest of the three layers, not a replacement for the others).
    if (env.STORAGE_PROVIDER === "s3") {
      for (const key of ["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER=s3`,
          });
        }
      }
    }

    if (env.NODE_ENV !== "production") return;

    if (env.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET must be at least 32 characters in production",
      });
    }
    if (env.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must be at least 32 characters in production",
      });
    }
    if (env.CORS_ORIGINS.some((origin) => origin.includes("localhost"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "CORS_ORIGINS must not include localhost in production",
      });
    }
    if (env.SMTP_HOST === "localhost" || env.SMTP_HOST === "mailhog") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "SMTP_HOST must point at a real mail provider in production, not the dev MailHog catcher",
      });
    }
    // Phase 4 — push notifications are optional in dev (FcmService degrades
    // to a logged no-op with no credentials, see FCM.md) but required once
    // this actually ships, same treatment as the JWT secrets above.
    if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FCM_PROJECT_ID"],
        message: "FCM_PROJECT_ID, FCM_CLIENT_EMAIL, and FCM_PRIVATE_KEY are all required in production",
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

/** Used directly by ConfigModule.forRoot({ validate }). Throws a readable, aggregated error on failure. */
export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    console.error(`\nInvalid environment configuration:\n${formatted}\n`);
    throw new Error("Environment validation failed. See errors above.");
  }
  return result.data;
}
