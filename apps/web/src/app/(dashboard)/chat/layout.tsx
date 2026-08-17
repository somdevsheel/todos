import type { ReactNode } from "react";
import { SocketProvider } from "@/components/chat/SocketProvider";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
