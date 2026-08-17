import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export const DEVICE_PLATFORMS = ["IOS", "ANDROID", "WEB"] as const;

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(4096)
  deviceToken!: string;

  @IsEnum(DEVICE_PLATFORMS)
  platform!: (typeof DEVICE_PLATFORMS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}
