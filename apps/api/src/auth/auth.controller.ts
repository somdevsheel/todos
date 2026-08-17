import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { firstValue } from "../common/utils/http.util";
import { AuthService, type RequestMeta } from "./auth.service";
import { InviteUserDto } from "./dto/invite-user.dto";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

/** 5 requests/minute — deliberately stricter than the API-wide default throttle (see SECURITY.md). */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

function requestMeta(req: Request): RequestMeta {
  return { ipAddress: req.ip, userAgent: firstValue(req.headers["user-agent"]) };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Note: AuthService.invite() writes its own USER_INVITED audit entry
  // directly (it needs the invitation id, which @Audit()'s generic
  // response-shape inference can't reach) — no @Audit() here to avoid a
  // duplicate log entry. See AuditInterceptor for the declarative pattern
  // used by the other CRUD modules.
  @Post("invite")
  @Roles("SUPER_ADMIN", "ADMIN")
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteUserDto) {
    return this.authService.invite({ sub: user.sub, organizationId: user.organizationId }, dto);
  }

  @Get("invitations/:token")
  @Public()
  getInvitation(@Param("token") token: string) {
    return this.authService.getInvitationPreview(token);
  }

  @Post("accept-invitation")
  @Public()
  @Throttle(AUTH_THROTTLE)
  acceptInvitation(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.authService.acceptInvitation(dto, requestMeta(req));
  }

  @Post("login")
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, requestMeta(req));
  }

  @Post("refresh")
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, requestMeta(req));
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.logout(user.sub, dto.refreshToken, requestMeta(req));
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.authService.logoutAll(user.sub, requestMeta(req));
  }

  @Post("forgot-password")
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto, requestMeta(req));
  }

  @Post("reset-password")
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto, requestMeta(req));
  }
}
