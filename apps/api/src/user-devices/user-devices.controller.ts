import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { UserDevicesService } from "./user-devices.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";

@Controller("user-devices")
export class UserDevicesController {
  constructor(private readonly userDevicesService: UserDevicesService) {}

  @Post()
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceDto) {
    return this.userDevicesService.register(user.sub, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.userDevicesService.findMine(user.sub);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.userDevicesService.remove(user.sub, id);
  }
}
