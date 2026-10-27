import {
  BellRingIcon,
  BookmarkIcon,
  MessageCircleIcon,
  SendIcon,
} from "@/components/ui/icons";
import type { OverviewMetricStats } from "@/features/overview/overview";

type KpiDefinition = {
  label: string;
  value: number | null;
  icon: typeof BookmarkIcon;
  note: string;
};

function Kpi({ label, value, icon: Icon, note }: KpiDefinition) {
  return (
    <div className="rounded-[14px] border border-white/20 bg-white/15 p-3.5 backdrop-blur-[8px] motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-white/40 motion-safe:hover:shadow-[0_6px_18px_rgba(0,0,0,.14)]">
      <div className="flex items-center gap-1.5 text-[12px] opacity-80">
        <Icon size={14} />
        {label}
      </div>
      <p className="my-1 text-[24px] font-bold">{value ?? "—"}</p>
      <p className="text-[11px] opacity-90">{note}</p>
    </div>
  );
}

/**
 * Placeholder tiles shown while the real numbers stream in. They keep the grid
 * the same size and styling so the hero does not shift, and they show no
 * invented figures.
 */
function KpiSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[14px] border border-white/20 bg-white/15 p-3.5 backdrop-blur-[8px]"
    >
      <div className="h-4 w-24 rounded bg-white/25" />
      <div className="my-2.5 h-7 w-12 rounded bg-white/35" />
      <div className="h-3 w-16 rounded bg-white/20" />
    </div>
  );
}

export function KpiSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <KpiSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Presentational KPI row for the overview hero. Values are aggregated by the
 * authenticated server-side overview query; unavailable metrics stay explicit.
 */
export function OverviewKpis({ stats }: { stats: OverviewMetricStats }) {
  const kpis: KpiDefinition[] = [
    { label: "Leads Saved", value: stats.savedLeads, icon: BookmarkIcon, note: "All time" },
    {
      label: "Contacted",
      value: stats.contactedLast7Days,
      icon: SendIcon,
      note: stats.contactedLast7Days === null
        ? "Contact history unavailable"
        : "Marked contacted · last 7 days",
    },
    {
      label: "Replies",
      value: stats.replies,
      icon: MessageCircleIcon,
      note: "Reply tracking unavailable",
    },
    {
      label: "Follow-ups Due",
      value: stats.followUpsDue,
      icon: BellRingIcon,
      note: "Due today or earlier",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Kpi key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
