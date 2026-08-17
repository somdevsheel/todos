import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthConfig } from "../config/configuration";

/**
 * The ONLY place in the codebase that reads ALLOWED_EMAIL_DOMAINS. Called
 * from AuthService at invite time, login time, and again at accept-invitation
 * time (defense-in-depth, in case an invitation's email was somehow edited
 * after issuance). The frontend never re-implements this check — it is
 * purely a backend-enforced restriction, per AUTHENTICATION.md.
 */
@Injectable()
export class EmailDomainService {
  constructor(private readonly configService: ConfigService) {}

  private get allowedDomains(): string[] {
    return this.configService.get<AuthConfig>("auth")!.allowedEmailDomains;
  }

  isAllowedDomain(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase().trim();
    if (!domain) return false;
    return this.allowedDomains.includes(domain);
  }

  getAllowedDomains(): string[] {
    return [...this.allowedDomains];
  }
}
