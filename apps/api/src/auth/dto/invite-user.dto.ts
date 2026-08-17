import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { SYSTEM_ROLES, type RoleName } from "@arutech/shared-types";

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
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
