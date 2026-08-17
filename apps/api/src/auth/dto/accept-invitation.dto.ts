import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { IsStrongPassword } from "./is-strong-password.decorator";

export class AcceptInvitationDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;
}
