import { Suspense } from "react";
import { CalendarDays, MessageCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { StatCard } from "@/components/dashboard/StatCard";
import { NotificationCountWidget } from "@/components/dashboard/NotificationCountWidget";
import { TaskStatsWidgets } from "@/components/dashboard/TaskStatsWidgets";
import { EmployeeCountWidget, DepartmentCountWidget, TeamCountWidget } from "@/components/dashboard/OrgStatsWidgets";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const isOrgLevel = hasAnyRole(user, ["SUPER_ADMIN", "ADMIN", "MANAGER"]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          {greeting()}, {user.firstName}
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Here&apos;s what&apos;s happening today.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-muted)]">Today&apos;s overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Suspense fallback={<><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></>}>
            <TaskStatsWidgets />
          </Suspense>
          <StatCard icon={CalendarDays} label="Upcoming events" value={0} comingSoon hint="Coming in Phase 3" />
          <StatCard icon={MessageCircle} label="Unread messages" value={0} comingSoon hint="Coming in Phase 5" />
          <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
            <NotificationCountWidget />
          </Suspense>
        </div>
      </section>

      {isOrgLevel && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-muted)]">Organization overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
              <EmployeeCountWidget />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
              <DepartmentCountWidget />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
              <TeamCountWidget />
            </Suspense>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <EmptyState title="No activity yet" description="The company activity feed arrives with tasks, events, and chat in later phases." />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
          </CardHeader>
          <EmptyState title="Calendar isn't built yet" description="Event management lands in Phase 3 — see ARCHITECTURE.md for the roadmap." />
        </Card>
      </div>
    </div>
  );
}
