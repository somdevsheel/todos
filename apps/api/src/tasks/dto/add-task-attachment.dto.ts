import { IsUUID } from "class-validator";

export class AddTaskAttachmentDto {
  @IsUUID()
  fileId!: string;
}
