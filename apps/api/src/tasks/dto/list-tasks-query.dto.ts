import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_VIEWS, type TaskPriority, type TaskStatus, type TaskView } from "@arutech/shared-types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListTasksQueryDto extends PaginationQueryDto {
  /** Server-side shortcut for the spec's named views (§12) — see TasksService.buildViewWhere(). */
  @IsOptional()
  @IsIn(TASK_VIEWS)
  view?: TaskView;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @IsOptional()
  @IsUUID()
  createdByUserId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
