import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from "class-validator";
import { CONVERSATION_TYPES, type ConversationType } from "@arutech/shared-types";

export class CreateConversationDto {
  @IsIn(CONVERSATION_TYPES)
  type!: ConversationType;

  /** Required for GROUP — a DIRECT conversation's display name is derived client-side from the other participant. */
  @ValidateIf((dto: CreateConversationDto) => dto.type === "GROUP")
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  /** DIRECT: exactly one other user. GROUP: at least one other user (the creator is always added automatically). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  memberUserIds!: string[];
}
