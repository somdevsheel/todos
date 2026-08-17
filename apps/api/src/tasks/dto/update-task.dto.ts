import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { TASK_PRIORITIES, type TaskPriority } from "@arutech/shared-types";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
