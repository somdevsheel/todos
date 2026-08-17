import type { CurrentUser } from "@arutech/shared-types";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Topbar } from "./Topbar";

export function DashboardShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomNav user={user} />
    </div>
  );
}
