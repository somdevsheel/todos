import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { createChatSocket } from "./socket";
import { useAuth } from "./auth-context";

const SocketContext = createContext<Socket | null>(null);

/** One socket for the whole authenticated app session — mounted in (tabs)/_layout.tsx, torn down on sign-out/unmount. */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }
    const instance = createChatSocket();
    setSocket(instance);
    return () => {
      instance.disconnect();
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useChatSocket(): Socket | null {
  return useContext(SocketContext);
}
