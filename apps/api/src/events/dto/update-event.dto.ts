import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, IsUrl, MinLength } from "class-validator";

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  meetingUrl?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
