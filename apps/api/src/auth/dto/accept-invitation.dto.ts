import { IsOptional, IsString, MinLength } from "class-validator";
import { IsStrongPassword } from "./is-strong-password.decorator";

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;
}
