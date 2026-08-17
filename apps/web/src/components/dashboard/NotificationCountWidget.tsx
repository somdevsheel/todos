import { Bell } from "lucide-react";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { StatCard } from "./StatCard";

/**
 * The one personal dashboard widget backed by a fully real Phase-1
 * endpoint (GET /notifications/unread-count) — the other personal widgets
 * on this page are placeholder data until their owning phase
 * (Tasks/Calendar/Chat) lands.
 */
export async function NotificationCountWidget() {
  const accessToken = await getAccessTokenFromCookies();
  const { count } = await apiFetch<{ count: number }>("/notifications/unread-count", { accessToken });
  return <StatCard icon={Bell} label="Notifications" value={count} hint={count === 0 ? "You're all caught up" : "Unread"} />;
}
