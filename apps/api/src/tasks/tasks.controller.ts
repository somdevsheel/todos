import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { UpdateTaskStatusDto } from "./dto/update-task-status.dto";
import { ListTasksQueryDto } from "./dto/list-tasks-query.dto";
import { AssignTaskDto } from "./dto/assign-task.dto";
import { AddTaskAttachmentDto } from "./dto/add-task-attachment.dto";

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTasksQueryDto) {
    return this.tasksService.findAll(user.organizationId, user, query);
  }

  @Get("stats")
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.stats(user.organizationId, user.sub);
  }

  @Get(":id")
  @OrgScopeResource({ model: "task" })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tasksService.findOne(user.organizationId, id);
  }

  @Patch(":id")
  @OrgScopeResource({ model: "task" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(user.organizationId, id, user, dto);
  }

  @Patch(":id/status")
  @OrgScopeResource({ model: "task" })
  updateStatus(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.tasksService.updateStatus(user.organizationId, id, user, dto.status);
  }

  @Delete(":id")
  @OrgScopeResource({ model: "task" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tasksService.remove(user.organizationId, id, user);
  }

  @Post(":id/assignees")
  @OrgScopeResource({ model: "task" })
  addAssignee(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AssignTaskDto) {
    return this.tasksService.addAssignee(user.organizationId, id, user, dto.userId);
  }

  @Delete(":id/assignees/:userId")
  @OrgScopeResource({ model: "task" })
  removeAssignee(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("userId") userId: string) {
    return this.tasksService.removeAssignee(user.organizationId, id, user, userId);
  }

  @Post(":id/attachments")
  @OrgScopeResource({ model: "task" })
  addAttachment(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AddTaskAttachmentDto) {
    return this.tasksService.addAttachment(user.organizationId, id, user, dto.fileId);
  }

  @Delete(":id/attachments/:attachmentId")
  @OrgScopeResource({ model: "task" })
  removeAttachment(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("attachmentId") attachmentId: string) {
    return this.tasksService.removeAttachment(user.organizationId, id, attachmentId, user);
  }
}
