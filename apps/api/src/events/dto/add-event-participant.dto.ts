import { IsUUID } from "class-validator";

export class AddEventParticipantDto {
  @IsUUID()
  userId!: string;
}
