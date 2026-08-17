import { PresenceService } from "./presence.service";

describe("PresenceService", () => {
  it("is online only while at least one socket is connected", () => {
    const presence = new PresenceService();
    presence.addConnection("user-1", "socket-a");
    expect(presence.isOnline("user-1")).toBe(true);

    presence.addConnection("user-1", "socket-b");
    presence.removeConnection("user-1", "socket-a");
    expect(presence.isOnline("user-1")).toBe(true); // socket-b still connected

    presence.removeConnection("user-1", "socket-b");
    expect(presence.isOnline("user-1")).toBe(false);
  });

  it("reports the online/offline transition only on the first connect and the last disconnect", () => {
    const presence = new PresenceService();
    expect(presence.addConnection("user-1", "socket-a")).toBe(true); // first socket -> just came online
    expect(presence.addConnection("user-1", "socket-b")).toBe(false); // already online

    expect(presence.removeConnection("user-1", "socket-a")).toBe(false); // socket-b still connected
    expect(presence.removeConnection("user-1", "socket-b")).toBe(true); // last one -> just went offline
  });

  it("is focused on a conversation if any of the user's sockets has it open", () => {
    const presence = new PresenceService();
    presence.addConnection("user-1", "socket-a");
    presence.addConnection("user-1", "socket-b");
    presence.setFocus("socket-a", "conv-1");

    expect(presence.isFocused("user-1", "conv-1")).toBe(true);
    expect(presence.isFocused("user-1", "conv-2")).toBe(false);
  });

  it("clears focus when the socket disconnects", () => {
    const presence = new PresenceService();
    presence.addConnection("user-1", "socket-a");
    presence.setFocus("socket-a", "conv-1");

    presence.removeConnection("user-1", "socket-a");

    expect(presence.isFocused("user-1", "conv-1")).toBe(false);
  });

  it("never confuses one user's focus for another's", () => {
    const presence = new PresenceService();
    presence.addConnection("user-1", "socket-a");
    presence.addConnection("user-2", "socket-b");
    presence.setFocus("socket-b", "conv-1");

    expect(presence.isFocused("user-1", "conv-1")).toBe(false);
    expect(presence.isFocused("user-2", "conv-1")).toBe(true);
  });
});
