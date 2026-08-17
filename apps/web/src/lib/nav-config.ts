import { Bell, Calendar, CheckSquare, Home, MessageCircle, Settings, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import { NAV_ITEMS } from "@arutech/shared-types";

export { NAV_ITEMS };

/** Maps the icon name string on each shared NavItem to an actual lucide-react component. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  home: Home,
  "check-square": CheckSquare,
  calendar: Calendar,
  "message-circle": MessageCircle,
  bell: Bell,
  users: Users,
  "id-badge": UserRound,
  settings: Settings,
  shield: ShieldCheck,
};
