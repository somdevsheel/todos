import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { SYSTEM_ROLES, type RoleName } from "@arutech/shared-types";

export class InviteUserDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsIn(SYSTEM_ROLES)
  role!: RoleName;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
