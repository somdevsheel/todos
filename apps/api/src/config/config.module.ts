import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { validateEnv } from "./env.schema";
import configuration from "./configuration";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env"],
      // validateEnv throws synchronously on any missing/invalid variable —
      // this is what makes startup fail fast instead of failing on the
      // first request that touches the missing config.
      validate: validateEnv,
      load: [(): ReturnType<typeof configuration> => configuration(validateEnv(process.env))],
    }),
  ],
})
export class ConfigModule {}
