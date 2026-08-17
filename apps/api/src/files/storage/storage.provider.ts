import type { Readable } from "stream";

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");

/**
 * Storage-provider-agnostic interface — every caller (FilesService today;
 * chat/event attachments in later phases) depends on this, never on a
 * concrete implementation. Swapping `STORAGE_PROVIDER=local` for an `s3`
 * implementation later means adding one new class that implements this
 * interface, not touching any caller. See DEPLOYMENT.md for why
 * local-disk storage is a dev/single-instance-only choice.
 *
 * Deliberately does NOT track mimeType/size — that's already the `File`
 * row's job (see prisma/schema.prisma). This interface only ever moves
 * bytes, keyed by an opaque storage key (a UUID chosen by the caller,
 * never the original filename — see FilesService).
 */
export interface StorageProvider {
  save(key: string, buffer: Buffer): Promise<void>;
  read(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}
