import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { RedisConfig } from "../config/configuration";
import { REDIS_CLIENT } from "./redis.constants";

/**
 * One shared ioredis client for anything that just needs plain Redis
 * commands (today: the WebSocket ws-ticket store — see
 * websocket/ws-ticket.service.ts). RemindersModule's BullMQ connection is
 * deliberately left as its own separate client — BullMQ has its own
 * connection-option requirements (`maxRetriesPerRequest: null`) and
 * refactoring it to share this one isn't in scope here.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => new Redis(configService.get<RedisConfig>("redis")!.url),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
