import { io, type Socket } from "socket.io-client";
import { API_URL, apiFetch } from "./api-client";

/**
 * Mirrors apps/web/src/lib/socket.ts's shape (same ticket-based auth — see
 * AUTHENTICATION.md's "WebSocket authentication"), but simpler here: the
 * mobile app already talks to the API directly for every request (no BFF
 * hop to route the ticket-mint call through), so `auth` just calls
 * POST /auth/ws-ticket with the already-stored access token like any
 * other authenticated request.
 */
export function createChatSocket(): Socket {
  const origin = new URL(API_URL).origin;
  const socket = io(origin, {
    path: "/socket.io",
    autoConnect: false,
    auth: (callback) => {
      apiFetch<{ ticket: string }>("/auth/ws-ticket", { method: "POST" })
        .then(({ ticket }) => callback({ ticket }))
        .catch(() => callback({}));
    },
  });
  socket.connect();
  return socket;
}
