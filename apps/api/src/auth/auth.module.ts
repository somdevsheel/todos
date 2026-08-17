import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditModule } from "../audit/audit.module";
import { MailerModule } from "../mailer/mailer.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailDomainService } from "./email-domain.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({}), MailerModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, EmailDomainService, JwtAccessStrategy],
  exports: [EmailDomainService, AuthService],
})
export class AuthModule {}
