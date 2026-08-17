import { BadRequestException, Controller, Delete, Get, Param, Post, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { FilesService } from "./files.service";

/**
 * Hard safety backstop at the multer layer, well above any sane
 * MAX_UPLOAD_SIZE_MB, so a malicious huge upload is rejected before being
 * fully buffered in memory rather than after. The real, configurable
 * limit is enforced by FilesService against `storage.maxUploadSizeBytes`.
 */
const MULTER_MEMORY_CEILING_BYTES = 25 * 1024 * 1024;

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MULTER_MEMORY_CEILING_BYTES } }))
  upload(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file was uploaded.");
    return this.filesService.upload(user.organizationId, user.sub, file);
  }

  @Get(":id")
  @OrgScopeResource({ model: "file" })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.getForDownload(user.organizationId, id);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(":id")
  @OrgScopeResource({ model: "file" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.filesService.remove(user.organizationId, id, user.sub, user.roles);
  }
}
