import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StorageConfig } from "../../config/configuration";
import { LocalDiskStorageProvider } from "./local-disk.storage";
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
            // Fail loud at startup, not silently fall back to local disk —
            // an operator who set STORAGE_PROVIDER=s3 needs to know this
            // isn't implemented yet, not discover it on the first upload.
            throw new Error(
              "STORAGE_PROVIDER=s3 is not implemented yet — see FilesModule/StorageProvider in DEPLOYMENT.md's roadmap.",
            );
          default:
            throw new Error(`Unknown STORAGE_PROVIDER: "${storageConfig.provider satisfies never}"`);
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
