import { Matches, MaxLength, MinLength } from "class-validator";
import { applyDecorators } from "@nestjs/common";

/**
 * 8-128 characters, one letter and one number. Applied to every "set a new
 * password" DTO field. The upper bound isn't a usability rule — Argon2's
 * hashing cost scales with input size on top of its configured memory/time
 * cost, so an unbounded password field on a public endpoint is a hashing-cost
 * amplification vector (OWASP's password-storage cheat sheet recommends
 * exactly this cap for this reason), not just a policy preference.
 */
export function IsStrongPassword() {
  return applyDecorators(
    MinLength(8, { message: "Password must be at least 8 characters." }),
    MaxLength(128, { message: "Password must be at most 128 characters." }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
      message: "Password must contain at least one letter and one number.",
    }),
  );
}
