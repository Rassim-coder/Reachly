import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function SettingsPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="Settings"
        description="Your profile and prospecting preferences."
        planned={[
          "Persist name, target niches, target location, and what you offer.",
          "Validate and load saved preferences for the signed-in user.",
          "Notification preferences.",
        ]}
      />
    </DashboardPage>
  );
}