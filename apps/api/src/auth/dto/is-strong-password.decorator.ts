import { Matches, MinLength } from "class-validator";
import { applyDecorators } from "@nestjs/common";

/** At least 8 characters, one letter and one number. Applied to every "set a new password" DTO field. */
export function IsStrongPassword() {
  return applyDecorators(
    MinLength(8, { message: "Password must be at least 8 characters." }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
      message: "Password must contain at least one letter and one number.",
    }),
  );
}
