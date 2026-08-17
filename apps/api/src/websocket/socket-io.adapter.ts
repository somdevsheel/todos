import type { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";

/**
 * Config-driven Socket.IO CORS, applied in main.ts via
 * `app.useWebSocketAdapter(new SocketIoAdapter(app, corsConfig.origins))`
 * rather than hardcoded in `@WebSocketGateway()`'s decorator options
 * (which are fixed at class-decoration time, before ConfigService exists) —
 * reuses the exact same allowlist as REST CORS (`CorsConfig.origins`), so
 * the WebSocket exception documented in AUTHENTICATION.md is still scoped
 * to only the trusted Next.js origin, never a wildcard.
 */
export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigins: string[],
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigins, credentials: false },
    });
  }
}
