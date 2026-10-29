import { Suspense } from "react";

import {
  Card,
  CardHeader,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";
import { AppearanceSettings } from "@/features/settings/components/appearance-settings";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { ProfileSettingsForm } from "@/features/settings/components/profile-settings-form";
import { getSettingsPageData } from "@/features/settings/queries";

export default function SettingsPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, and follow-up notifications."
      />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </DashboardPage>
  );
}

async function SettingsContent() {
  const result = await getSettingsPageData();

  if (!result.ok) {
    return (
      <Card>
        <div role="alert">
          <EmptyState title="Could not load settings" description={result.message} />
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader
          title="Profile"
          description="Update the name shown around Reachly."
        />
        <ProfileSettingsForm
          initialName={result.data.fullName}
          email={result.data.email}
        />
      </Card>

      <Card>
        <CardHeader
          title="Appearance"
          description="Choose how Reachly looks on this device."
        />
        <AppearanceSettings />
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader
          title="Notifications"
          description="Choose which outstanding follow-up groups appear in the dashboard bell."
        />
        <NotificationSettings
          initialPreferences={result.data.notificationPreferences}
        />
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-1 gap-4 xl:grid-cols-2"
    >
      <span className="sr-only">Loading settings…</span>
      {[0, 1, 2].map((section) => (
        <Card key={section} className={section === 2 ? "xl:col-span-2" : undefined}>
          <div className="mb-4 h-4 w-24 animate-pulse rounded bg-field" />
          <div className="space-y-3">
            <div className="h-9 animate-pulse rounded-xl bg-field" />
            <div className="h-9 animate-pulse rounded-xl bg-field" />
          </div>
        </Card>
      ))}
    </div>
  );
}
