import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class AdminUpdateUserDto {
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

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
