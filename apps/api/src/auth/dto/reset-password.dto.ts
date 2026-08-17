import { IsString } from "class-validator";
import { IsStrongPassword } from "./is-strong-password.decorator";

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;
}
