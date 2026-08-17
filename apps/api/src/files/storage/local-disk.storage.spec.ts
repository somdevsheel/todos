import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { ConfigService } from "@nestjs/config";
import { LocalDiskStorageProvider } from "./local-disk.storage";

async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe("LocalDiskStorageProvider", () => {
  let baseDir: string;
  let provider: LocalDiskStorageProvider;

  beforeEach(async () => {
    // localDir is deliberately an ABSOLUTE path here: LocalDiskStorageProvider
    // resolves it via `path.resolve(process.cwd(), localDir)`, and an
    // absolute second argument always wins over the first regardless of cwd
    // — so this test doesn't need to touch the real process.cwd() at all.
    baseDir = await mkdtemp(join(tmpdir(), "arutech-storage-test-"));
    const configService = { get: jest.fn().mockReturnValue({ localDir: baseDir }) } as unknown as ConfigService;
    provider = new LocalDiskStorageProvider(configService);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("round-trips save -> read -> delete for a given key", async () => {
    const key = "11111111-1111-1111-1111-111111111111";
    const original = Buffer.from("hello arutech workspace");

    await provider.save(key, original);
    const stream = await provider.read(key);
    const readBack = await readStreamToBuffer(stream);
    expect(readBack.equals(original)).toBe(true);

    await provider.delete(key);
    await expect(provider.read(key)).rejects.toThrow();
  });

  it("rejects a key containing path-traversal characters", async () => {
    await expect(provider.save("../escape", Buffer.from("x"))).rejects.toThrow(/Invalid storage key/);
    await expect(provider.save("nested/path", Buffer.from("x"))).rejects.toThrow(/Invalid storage key/);
  });

  it("throws a clear error when reading a key that was never saved", async () => {
    await expect(provider.read("22222222-2222-2222-2222-222222222222")).rejects.toThrow();
  });

  it("persists the file directly under the configured base directory, verifiable on disk", async () => {
    const key = "33333333-3333-3333-3333-333333333333";
    await provider.save(key, Buffer.from("on disk"));
    const onDisk = await readFile(join(baseDir, key), "utf-8");
    expect(onDisk).toBe("on disk");
  });
});
