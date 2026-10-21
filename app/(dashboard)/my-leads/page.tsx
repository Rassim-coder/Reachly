import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function MyLeadsPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="My Leads"
        description="The businesses you have saved, with status and follow-up dates."
        planned={[
          "List persistent leads belonging to the signed-in user.",
          "Filter by status: New, Contacted, Replied, Follow-up.",
          "Open a lead to view details, notes, and activity.",
        ]}
      />
    </DashboardPage>
  );
}