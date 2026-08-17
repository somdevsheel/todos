import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { TaskCommentsService } from "./task-comments.service";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { UpdateTaskCommentDto } from "./dto/update-task-comment.dto";

/**
 * Nested under /tasks/:taskId — a comment always belongs to exactly one
 * task and every check needs the task's org-scope anyway, so the route
 * carries `@OrgScopeResource({model:"task"}, paramName:"taskId")` rather
 * than a separate one for the comment itself.
 */
@Controller("tasks/:taskId/comments")
export class TaskCommentsController {
  constructor(private readonly taskCommentsService: TaskCommentsService) {}

  @Get()
  @OrgScopeResource({ model: "task", paramName: "taskId" })
  findAll(@CurrentUser() user: AuthenticatedUser, @Param("taskId") taskId: string, @Query() query: PaginationQueryDto) {
    return this.taskCommentsService.findAll(user.organizationId, taskId, query);
  }

  @Post()
  @OrgScopeResource({ model: "task", paramName: "taskId" })
  create(@CurrentUser() user: AuthenticatedUser, @Param("taskId") taskId: string, @Body() dto: CreateTaskCommentDto) {
    return this.taskCommentsService.create(user.organizationId, taskId, user, dto);
  }

  @Patch(":commentId")
  @OrgScopeResource({ model: "task", paramName: "taskId" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("taskId") taskId: string,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateTaskCommentDto,
  ) {
    return this.taskCommentsService.update(user.organizationId, taskId, commentId, user, dto.body);
  }

  @Delete(":commentId")
  @OrgScopeResource({ model: "task", paramName: "taskId" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("taskId") taskId: string, @Param("commentId") commentId: string) {
    return this.taskCommentsService.remove(user.organizationId, taskId, commentId, user);
  }
}
