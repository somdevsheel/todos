import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { SocketIoAdapter } from "./websocket/socket-io.adapter";
import type { AppConfig, CorsConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>("app")!;
  const corsConfig = configService.get<CorsConfig>("cors")!;

  app.use(helmet());
  app.enableCors({
    // Every REST call still goes exclusively through the Next.js BFF,
    // server-to-server (see AUTHENTICATION.md) — this allowlist covers
    // that. The one deliberate exception is the WebSocket gateway
    // (ChatGateway), which the browser connects to directly — Vercel can't
    // proxy a persistent connection — using the same trusted origin below,
    // never the real JWT (see AUTHENTICATION.md's "WebSocket
    // authentication" section for how that stays safe).
    origin: corsConfig.origins,
    credentials: false,
  });
  app.setGlobalPrefix(appConfig.globalPrefix);
  app.useWebSocketAdapter(new SocketIoAdapter(app, corsConfig.origins));
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
  console.error("Arutech Workspace API failed to start:", error);
  process.exit(1);
});
