import Link from "next/link";

import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function AnalyticsPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="Analytics"
        description="Prospecting performance over time."
        planned={[
          "Reply rate, average time to reply, contacted this month, deals won.",
          "Contacts-per-week chart and saved-to-won funnel.",
          "Date range filters — metrics are only shown once their formula is defined.",
        ]}
        action={
          <Link
            href="/ai-assistant"
            className="mt-3 inline-flex rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-white hover:opacity-90"
          >
            Ask AI about your sales data
          </Link>
        }
      />
    </DashboardPage>
  );
}