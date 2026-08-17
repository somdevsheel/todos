import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import type { Readable } from "stream";
import { AUDIT_ACTIONS, type FileSummary } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { StorageConfig } from "../config/configuration";
import { STORAGE_PROVIDER, type StorageProvider } from "./storage/storage.provider";

export interface UploadedFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface FileRow {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedByUserId: string;
}

@Injectable()
export class FilesService {
  private readonly storageConfig: StorageConfig;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.storageConfig = configService.get<StorageConfig>("storage")!;
  }

  async upload(organizationId: string, uploadedByUserId: string, file: UploadedFileInput): Promise<FileSummary> {
    if (file.size > this.storageConfig.maxUploadSizeBytes) {
      const maxMb = Math.round(this.storageConfig.maxUploadSizeBytes / (1024 * 1024));
      throw new BadRequestException(`File exceeds the ${maxMb}MB upload limit.`);
    }
    if (!this.storageConfig.allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException(`File type "${file.mimetype}" is not allowed.`);
    }

    // Storage key is always server-generated, never derived from the
    // user-supplied filename — sidesteps path-traversal/collision entirely
    // (see LocalDiskStorageProvider's defense-in-depth check too).
    const storageKey = randomUUID();
    await this.storage.save(storageKey, file.buffer);

    const created = await this.prisma.file.create({
      data: {
        organizationId,
        uploadedByUserId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
      },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: uploadedByUserId,
      action: AUDIT_ACTIONS.FILE_UPLOADED,
      entityType: "File",
      entityId: created.id,
      metadata: { filename: file.originalname, mimeType: file.mimetype, sizeBytes: file.size },
    });

    return this.toSummary(created);
  }

  async getForDownload(organizationId: string, id: string): Promise<{ file: FileRow & { mimeType: string }; stream: Readable }> {
    const file = await this.prisma.file.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!file) throw new NotFoundException("File not found");
    const stream = await this.storage.read(file.storageKey);
    return { file, stream };
  }

  async remove(organizationId: string, id: string, actorId: string, actorRoles: string[]): Promise<void> {
    const file = await this.prisma.file.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!file) throw new NotFoundException("File not found");

    const isPrivileged = actorRoles.includes("SUPER_ADMIN") || actorRoles.includes("ADMIN");
    if (file.uploadedByUserId !== actorId && !isPrivileged) {
      throw new ForbiddenException("You can only delete files you uploaded.");
    }

    await this.prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
    // Best-effort: the File row's soft-delete is the source of truth for
    // access control; a failed on-disk cleanup here is logged by the
    // storage provider's own error handling, not allowed to fail this call.
    await this.storage.delete(file.storageKey).catch(() => undefined);

    await this.auditService.log({
      organizationId,
      actorUserId: actorId,
      action: AUDIT_ACTIONS.FILE_DELETED,
      entityType: "File",
      entityId: id,
    });
  }

  private toSummary(file: FileRow): FileSummary {
    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString(),
      uploadedByUserId: file.uploadedByUserId,
    };
  }
}
