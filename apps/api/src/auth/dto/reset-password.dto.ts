import { IsString, MaxLength } from "class-validator";
import { IsStrongPassword } from "./is-strong-password.decorator";

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;
}
