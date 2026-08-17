import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createReadStream } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import { join, resolve } from "path";
import type { Readable } from "stream";
import type { StorageConfig } from "../../config/configuration";
import type { StorageProvider } from "./storage.provider";

/**
 * Dev/single-instance storage: writes under `STORAGE_LOCAL_DIR` (resolved
 * relative to the process's cwd, so `./uploads` means `apps/api/uploads`
 * whether run via `pnpm dev:api` or from the built `dist/` in Docker).
 * Not suitable for a multi-instance production deployment — see
 * DEPLOYMENT.md. Swap `STORAGE_PROVIDER=s3` for an S3-compatible
 * implementation of the same `StorageProvider` interface when that's needed.
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(configService: ConfigService) {
    const storageConfig = configService.get<StorageConfig>("storage")!;
    this.baseDir = resolve(process.cwd(), storageConfig.localDir);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    await writeFile(this.resolveKeyPath(key), buffer);
  }

  async read(key: string): Promise<Readable> {
    const path = this.resolveKeyPath(key);
    await stat(path); // throws ENOENT if missing — a clear error, not a silently empty stream
    return createReadStream(path);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKeyPath(key), { force: true });
  }

  /**
   * `key` is always a server-generated UUID (see FilesService.upload()) —
   * never user input — but this rejects path-traversal characters anyway
   * as defense-in-depth against any future caller that forgets that contract.
   */
  private resolveKeyPath(key: string): string {
    if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
      throw new Error(`Invalid storage key: "${key}"`);
    }
    return join(this.baseDir, key);
  }
}
