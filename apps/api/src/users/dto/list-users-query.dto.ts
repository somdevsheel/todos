import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { USER_STATUSES, type UserStatus } from "@arutech/shared-types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(USER_STATUSES)
  status?: UserStatus;
}
