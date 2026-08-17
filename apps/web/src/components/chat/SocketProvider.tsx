"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { createChatSocket } from "@/lib/socket";

const SocketContext = createContext<Socket | null>(null);

/**
 * One socket per browser tab, scoped to the /chat route tree (see
 * app/(dashboard)/chat/layout.tsx) — not a global always-on connection for
 * the whole app in this phase. Created client-side only (a fresh ticket
 * fetch needs the browser's own httpOnly-cookie session — see lib/socket.ts).
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const instance = createChatSocket();
    setSocket(instance);
    return () => {
      instance.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

/**
 * Null only during the brief window before the provider's effect has run
 * (e.g. the very first render). The returned socket may still be mid-
 * connect — check `socket.connected` or listen for "connect"/"disconnect"
 * rather than assuming a non-null socket is live.
 */
export function useChatSocket(): Socket | null {
  return useContext(SocketContext);
}
