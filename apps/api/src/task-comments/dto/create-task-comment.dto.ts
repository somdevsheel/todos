import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateTaskCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  /** Explicit picker-selected mentions — never parsed from free text (see AUTHENTICATION.md-style reasoning: explicit beats implicit). */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  mentionedUserIds?: string[];
}
