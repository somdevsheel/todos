import type { ConversationSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";
import { ConversationListLive } from "@/components/chat/ConversationListLive";
import { NewConversationButton } from "@/components/chat/NewConversationButton";

export default async function ChatPage() {
  const user = await requireAuth();
  const accessToken = await getAccessTokenFromCookies();
  const conversations = await apiFetch<ConversationSummary[]>("/conversations", { accessToken });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Chat</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Direct messages and group conversations.</p>
        </div>
        <NewConversationButton />
      </div>

      <ConversationListLive conversations={conversations} currentUserId={user.id} />
    </div>
  );
}
