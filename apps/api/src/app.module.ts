import { Module, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { OrgScopeGuard } from "./common/guards/org-scope.guard";
import type { ThrottleConfig } from "./config/configuration";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { HealthModule } from "./health/health.module";
import { MailerModule } from "./mailer/mailer.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { DepartmentsModule } from "./departments/departments.module";
import { TeamsModule } from "./teams/teams.module";
import { RolesModule } from "./roles/roles.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { UserDevicesModule } from "./user-devices/user-devices.module";
import { FilesModule } from "./files/files.module";
import { TasksModule } from "./tasks/tasks.module";
import { TaskCommentsModule } from "./task-comments/task-comments.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttle = configService.get<ThrottleConfig>("throttle")!;
        return [{ name: "default", ttl: throttle.ttl * 1000, limit: throttle.limit }];
      },
    }),
    AuditModule,
    MailerModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DepartmentsModule,
    TeamsModule,
    RolesModule,
    NotificationsModule,
    UserDevicesModule,
    FilesModule,
    TasksModule,
    TaskCommentsModule,
    // NOTE: events/reminders/chat still live under src/modules-future and
    // are deliberately NOT imported here — see each folder's README.md.
  ],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }) },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Interceptor order matters: Transform is outermost (wraps the FINAL
    // response), Audit is innermost (observes the RAW handler output) —
    // see AuditInterceptor's docstring.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Guard order: rate-limit first, then authenticate, then authorize by
    // role, then authorize by organization-scoped resource ownership.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: OrgScopeGuard },
  ],
})
export class AppModule {}
