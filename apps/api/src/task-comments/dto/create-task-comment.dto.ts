import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateTaskCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;

  /** Explicit picker-selected mentions — never parsed from free text (see AUTHENTICATION.md-style reasoning: explicit beats implicit). */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  mentionedUserIds?: string[];
}
