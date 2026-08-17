import type { NotificationPreferenceItem } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { NotificationPreferencesForm } from "@/components/settings/NotificationPreferencesForm";

export default async function SettingsPage() {
  const user = await requireAuth();
  const accessToken = await getAccessTokenFromCookies();
  const preferences = await apiFetch<NotificationPreferenceItem[]>("/notifications/preferences", { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Settings</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Manage your profile and preferences.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <ProfileForm user={user} />
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <NotificationPreferencesForm preferences={preferences} />
      </Card>
    </div>
  );
}
