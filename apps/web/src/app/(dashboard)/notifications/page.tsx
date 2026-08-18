import type { PaginatedResult } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { NotificationList, type NotificationItemView } from "@/components/notification/NotificationList";

export default async function NotificationsPage() {
  const accessToken = await getAccessTokenFromCookies();
  const { items } = await apiFetch<PaginatedResult<NotificationItemView>>("/notifications?page=1&pageSize=50", { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Notifications</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Task, event, and chat activity that involves you shows up here.</p>
      </div>
      <NotificationList initialItems={items} />
    </div>
  );
}
