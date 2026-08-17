import { IsIn } from "class-validator";
import { TASK_STATUSES, type TaskStatus } from "@arutech/shared-types";

export class UpdateTaskStatusDto {
  @IsIn(TASK_STATUSES)
  status!: TaskStatus;
}
