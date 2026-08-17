import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TasksModule } from "../tasks/tasks.module";
import { TaskCommentsController } from "./task-comments.controller";
import { TaskCommentsService } from "./task-comments.service";

@Module({
  imports: [TasksModule, AuditModule, NotificationsModule],
  controllers: [TaskCommentsController],
  providers: [TaskCommentsService],
})
export class TaskCommentsModule {}
