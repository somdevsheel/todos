import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { Public } from "../common/decorators/public.decorator";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { RedisHealthIndicator } from "./redis-health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.check("database"),
      () => this.redisIndicator.check("redis"),
    ]);
  }
}
