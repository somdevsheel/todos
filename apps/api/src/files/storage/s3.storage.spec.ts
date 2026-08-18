import { Logger } from "@nestjs/common";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageConfig } from "../../config/configuration";
import { S3StorageProvider } from "./s3.storage";

jest.mock("@aws-sdk/client-s3", () => {
  const send = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
    GetObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
  };
});

const CONFIGURED: StorageConfig = {
  provider: "s3",
  localDir: "./uploads",
  maxUploadSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["image/png"],
  endpoint: "https://s3.example.com",
  bucket: "arutech-uploads",
  accessKey: "AKIA_FAKE",
  secretKey: "fake-secret",
};

function mockedSend(): jest.Mock {
  return (new (S3Client as unknown as new () => { send: jest.Mock })()).send;
}

describe("S3StorageProvider", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["endpoint", { ...CONFIGURED, endpoint: "" }],
    ["bucket", { ...CONFIGURED, bucket: "" }],
    ["accessKey", { ...CONFIGURED, accessKey: "" }],
    ["secretKey", { ...CONFIGURED, secretKey: "" }],
  ])("throws immediately if %s is missing, rather than degrading to a no-op", (_field, config) => {
    expect(() => new S3StorageProvider(config)).toThrow(/STORAGE_PROVIDER=s3 requires/);
  });

  it("issues a PutObjectCommand with the bucket, key, and body on save", async () => {
    const provider = new S3StorageProvider(CONFIGURED);
    const send = mockedSend();
    send.mockResolvedValue({});

    await provider.save("file-key-1", Buffer.from("hello"));

    expect(PutObjectCommand).toHaveBeenCalledWith({ Bucket: "arutech-uploads", Key: "file-key-1", Body: Buffer.from("hello") });
  });

  it("issues a GetObjectCommand and returns the response Body on read", async () => {
    const provider = new S3StorageProvider(CONFIGURED);
    const send = mockedSend();
    const fakeStream = { pipe: jest.fn() };
    send.mockResolvedValue({ Body: fakeStream });

    const result = await provider.read("file-key-1");

    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: "arutech-uploads", Key: "file-key-1" });
    expect(result).toBe(fakeStream);
  });

  it("issues a DeleteObjectCommand on delete", async () => {
    const provider = new S3StorageProvider(CONFIGURED);
    const send = mockedSend();
    send.mockResolvedValue({});

    await provider.delete("file-key-1");

    expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: "arutech-uploads", Key: "file-key-1" });
  });

  describe("region", () => {
    it("warns (not silently) and falls back to us-east-1 when STORAGE_REGION isn't set", () => {
      const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

      new S3StorageProvider(CONFIGURED);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("STORAGE_REGION not set"));
      expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({ region: "us-east-1" }));
      warnSpy.mockRestore();
    });

    it("uses the configured region without warning when STORAGE_REGION is set", () => {
      const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

      new S3StorageProvider({ ...CONFIGURED, region: "ap-south-1" });

      expect(warnSpy).not.toHaveBeenCalled();
      expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({ region: "ap-south-1" }));
      warnSpy.mockRestore();
    });
  });
});
