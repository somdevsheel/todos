"use client";

import { io, type Socket } from "socket.io-client";

let cachedOrigin: string | null = null;

/** The API's bare origin, not its `/api/v1` REST prefix — Socket.IO connects to a host+path, not a REST route. */
function getSocketOrigin(): string {
  if (!cachedOrigin) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    cachedOrigin = new URL(apiUrl).origin;
  }
  return cachedOrigin;
}

async function fetchTicket(): Promise<string> {
  const res = await fetch("/api/chat/ws-ticket", { method: "POST" });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body?.error?.message ?? "Unable to start a chat session.");
  return body.data.ticket as string;
}

/**
 * The browser connects to the API directly for this one transport — see
 * AUTHENTICATION.md's "WebSocket authentication" section for why that's
 * safe despite the real JWT staying httpOnly. `auth` is a function, not a
 * plain object, specifically so Socket.IO calls it fresh before *every*
 * (re)connection attempt — a ws-ticket is single-use and 30s-lived (see
 * WsTicketService), so a page reload or a network blip needs a brand new
 * one, not the one from the first connect.
 */
export function createChatSocket(): Socket {
  const socket = io(getSocketOrigin(), {
    path: "/socket.io",
    autoConnect: false,
    auth: (callback) => {
      fetchTicket()
        .then((ticket) => callback({ ticket }))
        .catch(() => callback({}));
    },
  });
  socket.connect();
  return socket;
}
