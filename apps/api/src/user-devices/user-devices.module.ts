import { Module } from "@nestjs/common";
import { UserDevicesController } from "./user-devices.controller";
import { UserDevicesService } from "./user-devices.service";

@Module({
  controllers: [UserDevicesController],
  providers: [UserDevicesService],
  exports: [UserDevicesService],
})
export class UserDevicesModule {}
