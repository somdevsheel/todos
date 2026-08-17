import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // No @IsStrongPassword() here deliberately — an existing account's
  // password might predate the current strength rules and must still be
  // able to log in. The upper bound stays, though: it's not a policy check,
  // it's what stops an unbounded string from reaching argon2.verify() on
  // this public, rate-limited-but-still-unauthenticated endpoint (see
  // IsStrongPassword's docstring for why that matters).
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
