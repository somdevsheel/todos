import { IsString, MinLength } from "class-validator";

export class UpdateTaskCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
