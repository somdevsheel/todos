import { IsIn } from "class-validator";
import { SYSTEM_ROLES, type RoleName } from "@arutech/shared-types";

export class AssignRoleDto {
  @IsIn(SYSTEM_ROLES)
  role!: RoleName;
}
