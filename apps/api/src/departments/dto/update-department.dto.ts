import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
