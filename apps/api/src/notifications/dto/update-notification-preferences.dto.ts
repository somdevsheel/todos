import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsIn, ValidateNested } from "class-validator";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS, type NotificationCategory, type NotificationChannel } from "@arutech/shared-types";

class NotificationPreferenceItemDto {
  @IsIn(NOTIFICATION_CHANNELS)
  channel!: NotificationChannel;

  @IsIn(NOTIFICATION_CATEGORIES)
  category!: NotificationCategory;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  items!: NotificationPreferenceItemDto[];
}
