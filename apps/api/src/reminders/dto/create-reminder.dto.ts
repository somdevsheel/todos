import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { REMINDER_ENTITY_TYPES, type ReminderEntityType } from "@arutech/shared-types";

export class CreateReminderDto {
  @IsIn(REMINDER_ENTITY_TYPES)
  relatedEntityType!: ReminderEntityType;

  @IsUUID()
  relatedEntityId!: string;

  @IsDateString()
  remindAt!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
