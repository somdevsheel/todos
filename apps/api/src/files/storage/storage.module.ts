import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StorageConfig } from "../../config/configuration";
import { LocalDiskStorageProvider } from "./local-disk.storage";
import { S3StorageProvider } from "./s3.storage";
import { STORAGE_PROVIDER } from "./storage.provider";

@Module({
  providers: [
    LocalDiskStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalDiskStorageProvider],
      useFactory: (configService: ConfigService, localDisk: LocalDiskStorageProvider) => {
        const storageConfig = configService.get<StorageConfig>("storage")!;
        switch (storageConfig.provider) {
          case "local":
            return localDisk;
          case "s3":
            // Constructed here, not registered as its own eagerly-instantiated
            // Nest provider — a STORAGE_PROVIDER=local deployment (the
            // shipped default, see DEPLOYMENT.md) should never pay the cost
            // of validating S3 config it doesn't use. env.schema.ts already
            // requires the four STORAGE_* vars below whenever
            // STORAGE_PROVIDER=s3 is selected, so this constructor's own
            // check is defense-in-depth, not the first line of defense.
            return new S3StorageProvider(storageConfig);
          default:
            throw new Error(`Unknown STORAGE_PROVIDER: "${storageConfig.provider satisfies never}"`);
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
