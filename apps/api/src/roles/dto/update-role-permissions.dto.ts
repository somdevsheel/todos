import { ArrayUnique, IsArray, IsUUID } from "class-validator";

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  permissionIds!: string[];
}
