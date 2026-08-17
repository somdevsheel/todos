import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtConfig } from "../../config/configuration";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";

interface AccessTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
}

/**
 * Verifies the access token from `Authorization: Bearer <token>` and
 * produces `request.user`. Registered under the name "jwt-access" — see
 * JwtAuthGuard, which is the only place this strategy is invoked from.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt-access") {
  constructor(configService: ConfigService) {
    const jwtConfig = configService.get<JwtConfig>("jwt")!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      roles: payload.roles,
    };
  }
}
