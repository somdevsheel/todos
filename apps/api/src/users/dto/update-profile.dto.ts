import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
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
  @IsUrl()
  @MaxLength(2000)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
