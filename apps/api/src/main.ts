import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { AppConfig, CorsConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>("app")!;
  const corsConfig = configService.get<CorsConfig>("cors")!;

  app.use(helmet());
  app.enableCors({
    // The browser never calls this API directly — only the Next.js BFF
    // does, server-to-server (see AUTHENTICATION.md) — so this is
    // deliberately a strict allowlist, not a wildcard.
    origin: corsConfig.origins,
    credentials: false,
  });
  app.setGlobalPrefix(appConfig.globalPrefix);
  app.enableShutdownHooks();

  await app.listen(appConfig.port);

  Logger.log(
    `Arutech Workspace API listening on port ${appConfig.port} [${appConfig.nodeEnv}], prefix "/${appConfig.globalPrefix}"`,
    "Bootstrap",
  );
}

bootstrap().catch((error) => {
  // A failure here (most commonly: invalid/missing environment variables)
  // must abort startup loudly rather than leave a half-started process.
  // eslint-disable-next-line no-console
  console.error("Arutech Workspace API failed to start:", error);
  process.exit(1);
});
