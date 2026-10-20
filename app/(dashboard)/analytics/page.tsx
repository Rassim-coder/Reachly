import { PendingFeature } from "@/components/ui/page-shell";

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <PendingFeature
        title="Analytics"
        description="Prospecting performance over time."
        planned={[
          "Reply rate, average time to reply, contacted this month, deals won.",
          "Contacts-per-week chart and saved-to-won funnel.",
          "Date range filters — metrics are only shown once their formula is defined.",
        ]}
      />
    </div>
  );
}
