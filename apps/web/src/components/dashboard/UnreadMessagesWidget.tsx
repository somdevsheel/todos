import { MessageCircle } from "lucide-react";
import type { ConversationSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { StatCard } from "./StatCard";

/** Real data since Phase 5 — replaces the hardcoded `comingSoon` StatCard placeholder. */
export async function UnreadMessagesWidget() {
  const accessToken = await getAccessTokenFromCookies();
  const conversations = await apiFetch<ConversationSummary[]>("/conversations", { accessToken });
  const unread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return <StatCard icon={MessageCircle} label="Unread messages" value={unread} />;
}
