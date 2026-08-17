import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { createAnnouncementsService } from "./announcements.test-utils";

const ADMIN: AuthenticatedUser = { sub: "admin-1", email: "priya.admin@arutechconsultancy.com", organizationId: "org-1", roles: ["ADMIN"] };
const EMPLOYEE: AuthenticatedUser = { sub: "employee-1", email: "rahul@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };

describe("AnnouncementsService.create", () => {
  it("fans out SYSTEM_NOTIFICATION to every other active org member, not the author", async () => {
    const { service, prisma, notificationsService } = createAnnouncementsService();
    (prisma.announcement.create as jest.Mock).mockResolvedValue({
      id: "ann-1",
      organizationId: "org-1",
      title: "Office closed Friday",
      body: "Enjoy the long weekend.",
      createdByUser: { id: ADMIN.sub, firstName: "Priya", lastName: "Sharma" },
      createdAt: new Date(),
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "employee-1" }, { id: "employee-2" }]);

    await service.create(ADMIN, { title: "Office closed Friday", body: "Enjoy the long weekend." });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: ADMIN.sub } }) }),
    );
    expect(notificationsService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: "employee-1", type: "SYSTEM_NOTIFICATION" }),
      expect.objectContaining({ userId: "employee-2", type: "SYSTEM_NOTIFICATION" }),
    ]);
  });
});

describe("AnnouncementsService.remove", () => {
  it("throws NotFound for a nonexistent/already-deleted announcement", async () => {
    const { service, prisma } = createAnnouncementsService();
    (prisma.announcement.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.remove("org-1", "ann-1", ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lets the author delete their own announcement", async () => {
    const { service, prisma } = createAnnouncementsService();
    (prisma.announcement.findFirst as jest.Mock).mockResolvedValue({ id: "ann-1", createdByUserId: EMPLOYEE.sub });
    (prisma.announcement.update as jest.Mock).mockResolvedValue({});

    // EMPLOYEE isn't ADMIN/SUPER_ADMIN, but authored it themselves — this
    // path only exists in the model today via a privileged creator (see
    // AnnouncementsController's create gate), included for completeness
    // of the authorization rule itself.
    await expect(service.remove("org-1", "ann-1", EMPLOYEE)).resolves.toBeUndefined();
    expect(prisma.announcement.update).toHaveBeenCalledWith({ where: { id: "ann-1" }, data: { deletedAt: expect.any(Date) } });
  });

  it("rejects deletion by someone who is neither the author nor ADMIN/SUPER_ADMIN", async () => {
    const { service, prisma } = createAnnouncementsService();
    (prisma.announcement.findFirst as jest.Mock).mockResolvedValue({ id: "ann-1", createdByUserId: ADMIN.sub });

    await expect(service.remove("org-1", "ann-1", EMPLOYEE)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
