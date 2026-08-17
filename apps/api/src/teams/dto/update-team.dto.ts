import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
