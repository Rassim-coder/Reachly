import { PendingFeature } from "@/components/ui/page-shell";

export default function OverviewPage() {
  return (
    <div className="p-6">
      <PendingFeature
        title="Overview"
        description="Prospecting activity at a glance."
        planned={[
          "Leads saved, contacted, replies, and follow-ups due — calculated from real lead records.",
          "Leads over time chart with saved/contacted toggle.",
          "Recent leads, pipeline breakdown, follow-ups due, and leads by niche.",
        ]}
      />
    </div>
  );
}
