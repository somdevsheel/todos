import { IsEnum, IsOptional, IsString } from "class-validator";

export const DEVICE_PLATFORMS = ["IOS", "ANDROID", "WEB"] as const;

export class RegisterDeviceDto {
  @IsString()
  deviceToken!: string;

  @IsEnum(DEVICE_PLATFORMS)
  platform!: (typeof DEVICE_PLATFORMS)[number];

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}
