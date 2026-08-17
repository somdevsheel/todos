import type { RoleName } from "./role";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  /** Icon name, resolved to a component by the web app's icon registry. */
  icon: string;
  /** If omitted, visible to every authenticated role. */
  roles?: RoleName[];
  /** Shown in the compact mobile bottom nav (max ~5 items incl. "More"). */
  showInBottomNav?: boolean;
}

/**
 * Single source of truth for primary navigation, filtered per-user by
 * apps/web/src/lib/rbac.ts. Desktop Sidebar and mobile BottomNav both
 * render from this list so items are never defined twice.
 *
 * Routes beyond Dashboard/Notifications/Settings are placeholders in
 * Phase 1 (Tasks/Calendar/Chat/Teams/Employees land in later phases) but
 * are listed here now so the nav shape doesn't change shape later.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "home", showInBottomNav: true },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: "check-square", showInBottomNav: true },
  { key: "calendar", label: "Calendar", href: "/calendar", icon: "calendar", showInBottomNav: true },
  { key: "chat", label: "Chat", href: "/chat", icon: "message-circle", showInBottomNav: true },
  { key: "notifications", label: "Notifications", href: "/notifications", icon: "bell" },
  {
    key: "teams",
    label: "Teams",
    href: "/teams",
    icon: "users",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    key: "employees",
    label: "Employees",
    href: "/employees",
    icon: "id-badge",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
  { key: "admin", label: "Admin", href: "/admin", icon: "shield", roles: ["SUPER_ADMIN", "ADMIN"] },
];
