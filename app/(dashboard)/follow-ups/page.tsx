import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function FollowUpsPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="Follow-ups"
        description="Scheduled next steps, most urgent first."
        planned={[
          "Grouped into Overdue, Today, and This week from real dates.",
          "Schedule, reschedule, and complete a follow-up.",
          "Navigation count derived from persisted follow-up data.",
        ]}
      />
    </DashboardPage>
  );
}