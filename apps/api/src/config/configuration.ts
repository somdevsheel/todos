import type { EnvConfig } from "./env.schema";

/**
 * Typed, namespaced view over the validated environment. Every module
 * consumes config through `ConfigService.get<AppConfig>('app')` etc.
 * instead of reading `process.env` directly, so there is exactly one
 * place (this file) that maps env vars to runtime configuration.
 */
export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  globalPrefix: string;
  timezone: string;
  isProduction: boolean;
  frontendUrl: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  url: string;
}

export interface JwtConfig {
  accessSecret: string;
  accessTtl: string;
  refreshSecret: string;
  refreshTtl: string;
}

export interface AuthConfig {
  /**
   * The single source of truth for the company-only email restriction.
   * Consumed exclusively by auth/email-domain.service.ts — never
   * re-implemented or re-parsed anywhere else in the codebase.
   */
  allowedEmailDomains: string[];
}

export interface CorsConfig {
  origins: string[];
}

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
  authTtl: number;
  authLimit: number;
}

export interface StorageConfig {
  provider: "local" | "s3";
  localDir: string;
  maxUploadSizeBytes: number;
  allowedMimeTypes: string[];
}

export default (env: EnvConfig) => ({
  app: {
    nodeEnv: env.NODE_ENV,
    port: env.API_PORT,
    globalPrefix: env.API_GLOBAL_PREFIX,
    timezone: env.APP_TIMEZONE,
    isProduction: env.NODE_ENV === "production",
    frontendUrl: env.FRONTEND_URL,
  } satisfies AppConfig,
  database: {
    url: env.DATABASE_URL,
  } satisfies DatabaseConfig,
  redis: {
    url: env.REDIS_URL,
  } satisfies RedisConfig,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshTtl: env.JWT_REFRESH_TTL,
  } satisfies JwtConfig,
  auth: {
    allowedEmailDomains: env.ALLOWED_EMAIL_DOMAINS,
  } satisfies AuthConfig,
  cors: {
    origins: env.CORS_ORIGINS,
  } satisfies CorsConfig,
  mail: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL,
  } satisfies MailConfig,
  throttle: {
    ttl: env.THROTTLE_TTL,
    limit: env.THROTTLE_LIMIT,
    authTtl: env.AUTH_THROTTLE_TTL,
    authLimit: env.AUTH_THROTTLE_LIMIT,
  } satisfies ThrottleConfig,
  storage: {
    provider: env.STORAGE_PROVIDER,
    localDir: env.STORAGE_LOCAL_DIR,
    maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    allowedMimeTypes: env.ALLOWED_UPLOAD_MIME_TYPES,
  } satisfies StorageConfig,
});
