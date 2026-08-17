import type Redis from "ioredis";
import { WsTicketService } from "./ws-ticket.service";

function createWsTicketService() {
  const set = jest.fn().mockResolvedValue("OK");
  const getdel = jest.fn();
  const redis = { set, getdel } as unknown as Redis;
  const service = new WsTicketService(redis);
  return { service, set, getdel };
}

const IDENTITY = { sub: "user-1", email: "kajal@arutechconsultancy.com", organizationId: "org-1", roles: ["MANAGER"] };

describe("WsTicketService.issue", () => {
  it("stores the identity against a fresh opaque ticket with a 30s TTL", async () => {
    const { service, set } = createWsTicketService();

    const { ticket, expiresInSeconds } = await service.issue(IDENTITY);

    expect(expiresInSeconds).toBe(30);
    expect(ticket).toHaveLength(43); // 32 random bytes, base64url-encoded
    expect(set).toHaveBeenCalledWith(`ws-ticket:${ticket}`, JSON.stringify(IDENTITY), "EX", 30);
  });
});

describe("WsTicketService.consume", () => {
  it("returns null for an unknown/expired/already-used ticket", async () => {
    const { service, getdel } = createWsTicketService();
    getdel.mockResolvedValue(null);

    await expect(service.consume("bogus")).resolves.toBeNull();
  });

  it("returns the identity for a valid ticket and deletes it atomically (single use)", async () => {
    const { service, getdel } = createWsTicketService();
    getdel.mockResolvedValue(JSON.stringify(IDENTITY));

    const result = await service.consume("real-ticket");

    expect(result).toEqual(IDENTITY);
    expect(getdel).toHaveBeenCalledWith("ws-ticket:real-ticket");
  });

  it("returns null instead of throwing on malformed stored data", async () => {
    const { service, getdel } = createWsTicketService();
    getdel.mockResolvedValue("not json");

    await expect(service.consume("real-ticket")).resolves.toBeNull();
  });
});
