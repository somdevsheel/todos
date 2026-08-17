import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  logoUrl?: string;
}
