import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import type { DatabaseConfig } from "../config/configuration";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const database = configService.get<DatabaseConfig>("database");
    super({
      datasources: database ? { db: { url: database.url } } : undefined,
      log: [
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    // @ts-expect-error - $on event typing is loosely typed by the generated client
    this.$on("warn", (e: unknown) => this.logger.warn(e));
    // @ts-expect-error - $on event typing is loosely typed by the generated client
    this.$on("error", (e: unknown) => this.logger.error(e));
    await this.$connect();
    this.logger.log("Connected to PostgreSQL");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
