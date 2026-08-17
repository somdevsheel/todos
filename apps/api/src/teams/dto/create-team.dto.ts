import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
