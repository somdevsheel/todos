import { IsUUID } from "class-validator";

export class AddConversationMemberDto {
  @IsUUID()
  userId!: string;
}
