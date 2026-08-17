import { ArrayUnique, IsArray, IsBoolean, IsDateString, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength } from "class-validator";

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  meetingUrl?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  participantUserIds?: string[];
}
