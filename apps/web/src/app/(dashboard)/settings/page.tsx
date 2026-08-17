import { requireAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default async function SettingsPage() {
  const user = await requireAuth();

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
        <p className="text-sm text-[var(--color-ink-muted)]">
          Per-category notification toggles (task assigned, event reminders, mentions, etc.) arrive alongside the FCM
          integration — see NOTIFICATIONS.md.
        </p>
      </Card>
    </div>
  );
}
