import { Module } from "@nestjs/common";
import { UserDevicesModule } from "../user-devices/user-devices.module";
import { FcmService } from "./fcm.service";

@Module({
  imports: [UserDevicesModule],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
