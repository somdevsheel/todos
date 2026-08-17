import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthIndicatorService } from "@nestjs/terminus";
import Redis from "ioredis";
import type { RedisConfig } from "../config/configuration";

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(
    configService: ConfigService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    const redisConfig = configService.get<RedisConfig>("redis")!;
    this.client = new Redis(redisConfig.url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async check(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      if (this.client.status === "end" || this.client.status === "wait") {
        await this.client.connect();
      }
      const pong = await this.client.ping();
      if (pong !== "PONG") throw new Error(`Unexpected PING response: ${pong}`);
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
