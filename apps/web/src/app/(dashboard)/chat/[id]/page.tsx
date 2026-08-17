import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ConversationSummary, MessageSummary, PaginatedResult } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/user/UserAvatar";
import { ConversationView } from "@/components/chat/ConversationView";

function displayName(conversation: ConversationSummary, currentUserId: string): string {
  if (conversation.type === "GROUP") return conversation.name ?? "Group";
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other ? `${other.firstName} ${other.lastName}` : "Direct message";
}

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const accessToken = await getAccessTokenFromCookies();

  const [conversation, messages] = await Promise.all([
    apiFetch<ConversationSummary>(`/conversations/${id}`, { accessToken }),
    apiFetch<PaginatedResult<MessageSummary>>(`/conversations/${id}/messages?pageSize=50`, { accessToken }),
  ]);

  const other = conversation.type === "DIRECT" ? conversation.participants.find((p) => p.id !== user.id) : undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/chat" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to chat
      </Link>

      <div className="flex items-center gap-2">
        <UserAvatar firstName={other?.firstName ?? conversation.name ?? "?"} lastName={other?.lastName ?? ""} />
        <div>
          <h1 className="text-base font-semibold text-[var(--color-ink)]">{displayName(conversation, user.id)}</h1>
          {conversation.type === "GROUP" && (
            <p className="text-xs text-[var(--color-ink-muted)]">{conversation.participants.length} members</p>
          )}
        </div>
      </div>

      <ConversationView conversation={conversation} initialMessages={messages.items} currentUserId={user.id} />
    </div>
  );
}
