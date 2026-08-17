"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellOff, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export interface NotificationItemView {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationList({ initialItems }: { initialItems: NotificationItemView[] }) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const markRead = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    startTransition(async () => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      router.refresh();
    });
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    startTransition(async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      router.refresh();
    });
  };

  const unreadCount = items.filter((item) => !item.isRead).length;

  if (items.length === 0) {
    return <EmptyState icon={BellOff} title="No notifications yet" description="You'll see task, event, and chat notifications here as later phases ship." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" onClick={markAllRead} disabled={unreadCount === 0} loading={isPending}>
          <Check className="h-3.5 w-3.5" aria-hidden />
          Mark all as read
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Card key={item.id} className={item.isRead ? "opacity-70" : "border-[var(--color-accent)]"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{item.body}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              {!item.isRead && (
                <Button variant="ghost" size="sm" onClick={() => markRead(item.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
