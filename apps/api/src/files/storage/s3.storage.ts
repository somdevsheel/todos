import { Injectable, Logger } from "@nestjs/common";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import type { StorageConfig } from "../../config/configuration";
import type { StorageProvider } from "./storage.provider";

/**
 * S3-compatible storage — works against real AWS S3 or any S3-compatible
 * endpoint (MinIO, DigitalOcean Spaces, etc.) via STORAGE_ENDPOINT.
 * `forcePathStyle: true` unconditionally: harmless against AWS, required
 * against most self-hosted S3-compatible servers, so there's no reason to
 * make it configurable.
 *
 * `region` IS configurable (STORAGE_REGION), unlike forcePathStyle — most
 * self-hosted S3-compatible servers ignore the region entirely, but real
 * AWS S3 incorporates it into request signing, so a client configured for
 * the wrong region fails authentication against a real bucket even with
 * correct credentials. Defaults to "us-east-1" only as a harmless
 * placeholder for the ignore-it-entirely case; anyone pointing this at
 * real AWS S3 must set STORAGE_REGION to match their bucket's actual
 * region.
 *
 * Unlike FcmService's "degrade to a logged no-op when unconfigured"
 * pattern, this throws immediately in the constructor if selected without
 * complete config — matching StorageModule's existing "fail loud at
 * startup, not silently on first upload" comment. The two services differ
 * for a reason: FCM is an opportunistic side-effect of every notification
 * (missing config shouldn't break the app), but file storage is a hard
 * dependency — a misconfigured `STORAGE_PROVIDER=s3` has no sensible
 * degraded mode, every upload would just fail, so it's better to refuse
 * to boot than to serve a broken feature.
 *
 * Not verified against a real bucket — no S3-compatible endpoint exists in
 * any environment this code has run in (see DEPLOYMENT.md). Covered by
 * s3.storage.spec.ts's mocked S3Client instead.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(storageConfig: StorageConfig) {
    const { endpoint, bucket, accessKey, secretKey, region } = storageConfig;
    if (!endpoint || !bucket || !accessKey || !secretKey) {
      throw new Error(
        "STORAGE_PROVIDER=s3 requires STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY to all be set.",
      );
    }
    if (!region) {
      this.logger.warn(
        "STORAGE_REGION not set — defaulting to \"us-east-1\". Fine for most S3-compatible servers (they ignore it), " +
          "but real AWS S3 uses this for request signing — if this bucket is on real AWS, requests will fail " +
          "authentication unless STORAGE_REGION matches the bucket's actual region.",
      );
    }
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      forcePathStyle: true,
      region: region ?? "us-east-1",
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
    this.logger.log(`S3 storage initialized (bucket: ${bucket}, endpoint: ${endpoint}, region: ${region ?? "us-east-1"})`);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer }));
  }

  async read(key: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    // The SDK types Body as a union across Node/browser/React Native
    // runtimes — in the Node runtime (the only one this app ever runs in)
    // it's always a real Readable, never undefined, since GetObjectCommand
    // only resolves for an object that exists.
    return result.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
