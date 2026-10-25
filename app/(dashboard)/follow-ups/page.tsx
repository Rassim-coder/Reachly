import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function FollowUpsPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="Follow-ups"
        description="Scheduled next steps, most urgent first."
        planned={[
          "This dedicated queue will group real dates into Overdue, Today, and This week.",
          "Scheduling, rescheduling, and completing follow-ups are available from My Leads.",
          "Navigation count will be derived from persisted follow-up data.",
        ]}
      />
    </DashboardPage>
  );
}