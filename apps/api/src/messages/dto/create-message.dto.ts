import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;

  /** Explicit picker-selected @mentions — see Message.mentionedUserIds's docstring in schema.prisma. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  mentionedUserIds?: string[];
}
