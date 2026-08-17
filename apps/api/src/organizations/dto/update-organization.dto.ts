import { IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
