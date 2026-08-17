import type { ConfigService } from "@nestjs/config";
import { getMessaging } from "firebase-admin/messaging";
import type { UserDevicesService } from "../user-devices/user-devices.service";
import { FcmService } from "./fcm.service";

jest.mock("firebase-admin/app", () => ({
  getApps: jest.fn().mockReturnValue([]),
  initializeApp: jest.fn(),
  cert: jest.fn((x: unknown) => x),
}));
jest.mock("firebase-admin/messaging", () => ({ getMessaging: jest.fn() }));

const mockedMessaging = getMessaging as unknown as jest.Mock;

function createFcmService(fcmConfig: { projectId: string; clientEmail: string; privateKey: string }) {
  const configService = { get: jest.fn().mockReturnValue(fcmConfig) } as unknown as ConfigService;
  const findMine = jest.fn();
  const deactivateByToken = jest.fn().mockResolvedValue(undefined);
  const userDevicesService = { findMine, deactivateByToken } as unknown as UserDevicesService;

  const service = new FcmService(configService, userDevicesService);
  service.onModuleInit();

  return { service, findMine, deactivateByToken };
}

const UNCONFIGURED = { projectId: "", clientEmail: "", privateKey: "" };
const CONFIGURED = { projectId: "arutech", clientEmail: "svc@arutech.iam.gserviceaccount.com", privateKey: "fake-key" };

describe("FcmService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is a no-op and never touches devices/messaging when FCM env vars aren't set", async () => {
    const { service, findMine } = createFcmService(UNCONFIGURED);

    await service.sendToUser("user-1", { type: "TASK_ASSIGNED", title: "t", body: "b" }, true);

    expect(findMine).not.toHaveBeenCalled();
    expect(mockedMessaging).not.toHaveBeenCalled();
  });

  it("skips sending when the caller says the category is preference-disabled, even if FCM is configured", async () => {
    const { service, findMine } = createFcmService(CONFIGURED);

    await service.sendToUser("user-1", { type: "TASK_ASSIGNED", title: "t", body: "b" }, false);

    expect(findMine).not.toHaveBeenCalled();
  });

  it("sends to every active device, with type + stringified data in the payload", async () => {
    const sendEachForMulticast = jest.fn().mockResolvedValue({ responses: [{ success: true }, { success: true }] });
    mockedMessaging.mockReturnValue({ sendEachForMulticast });
    const { service, findMine } = createFcmService(CONFIGURED);
    findMine.mockResolvedValue([
      { deviceToken: "token-a" },
      { deviceToken: "token-b" },
    ]);

    await service.sendToUser("user-1", { type: "TASK_ASSIGNED", title: "New task", body: "Ship it", data: { taskId: "task-1" } }, true);

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["token-a", "token-b"],
      notification: { title: "New task", body: "Ship it" },
      data: { type: "TASK_ASSIGNED", taskId: "task-1" },
    });
  });

  it("deactivates only the device whose token FCM reports as unregistered", async () => {
    const sendEachForMulticast = jest.fn().mockResolvedValue({
      responses: [{ success: true }, { success: false, error: { code: "messaging/registration-token-not-registered" } }],
    });
    mockedMessaging.mockReturnValue({ sendEachForMulticast });
    const { service, findMine, deactivateByToken } = createFcmService(CONFIGURED);
    findMine.mockResolvedValue([{ deviceToken: "token-alive" }, { deviceToken: "token-dead" }]);

    await service.sendToUser("user-1", { type: "EVENT_REMINDER", title: "t", body: "b" }, true);

    expect(deactivateByToken).toHaveBeenCalledTimes(1);
    expect(deactivateByToken).toHaveBeenCalledWith("token-dead");
  });

  it("never throws when the underlying send call rejects", async () => {
    const sendEachForMulticast = jest.fn().mockRejectedValue(new Error("network down"));
    mockedMessaging.mockReturnValue({ sendEachForMulticast });
    const { service, findMine } = createFcmService(CONFIGURED);
    findMine.mockResolvedValue([{ deviceToken: "token-a" }]);

    await expect(service.sendToUser("user-1", { type: "TASK_ASSIGNED", title: "t", body: "b" }, true)).resolves.toBeUndefined();
  });
});
