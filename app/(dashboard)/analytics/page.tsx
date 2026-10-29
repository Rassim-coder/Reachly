import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import {
  Card,
  CardHeader,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";
import { LeadsByNicheChart } from "@/features/analytics/components/leads-by-niche-chart";
import { LeadsOverTimeChart } from "@/features/analytics/components/leads-over-time-chart";
import { LeadStatusDistributionChart } from "@/features/analytics/components/lead-status-distribution-chart";
import { OutreachActivityChart } from "@/features/analytics/components/outreach-activity-chart";
import {
  parseAnalyticsPeriod,
  type AnalyticsPeriod,
} from "@/features/analytics/analytics";
import { getAnalyticsDashboardData } from "@/features/analytics/queries";

type AnalyticsPageProps = {
  searchParams: Promise<{ range?: string | string[] }>;
};

const PERIODS: AnalyticsPeriod[] = [7, 30, 90];

export default function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  return (
    <DashboardPage>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </DashboardPage>
  );
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  // Request-time date boundaries and URL filters stay behind the Suspense
  // boundary so the static shell can render and stream immediately.
  await connection();
  const params = await searchParams;
  const period = parseAnalyticsPeriod(params.range);
  const result = await getAnalyticsDashboardData(period);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="Historical charts use the selected range; summary cards show lifetime or current-state metrics."
          action={<AnalyticsActions selected={period} />}
        />
        <Card>
          <EmptyState title="Could not load analytics" description={result.message} />
        </Card>
      </>
    );
  }

  const { data } = result;
  const current = data.current;
  const range = data.range;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Historical charts use the selected range; summary cards show lifetime or current-state metrics."
        action={<AnalyticsActions selected={period} />}
      />
      <section
        aria-label="Current lead metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Leads Saved"
          value={current?.metrics.savedLeads ?? null}
          note={current ? "All-time total" : "Current metrics unavailable"}
        />
        <MetricCard
          label="Contacted Leads"
          value={current?.metrics.contactedLeads ?? null}
          note={current ? "Currently marked Contacted" : "Current metrics unavailable"}
        />
        <MetricCard
          label="Interested Leads"
          value={current?.metrics.interestedLeads ?? null}
          note={current ? "Currently marked Interested" : "Current metrics unavailable"}
        />
        <MetricCard
          label="Follow-ups Due"
          value={current?.metrics.followUpsDue ?? null}
          note={current ? "Due today or earlier (UTC)" : "Current metrics unavailable"}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card>
          <CardHeader
            title="Leads Over Time"
            description={`Saved by creation date; contacted counts recorded transitions to Contacted (${range.startDate}–${range.endDate} UTC).`}
          />
          <LeadsOverTimeChart
            data={data.leadsOverTime}
            error={data.leadsOverTimeError}
          />
        </Card>

        <Card>
          <CardHeader
            title="Lead Status Distribution"
            description="Current status across all saved leads."
          />
          <LeadStatusDistributionChart
            data={current?.statuses ?? null}
            total={current?.metrics.savedLeads ?? null}
            error={data.currentError}
          />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Outreach Activity"
            description={`Recorded status and follow-up events · Last ${period} days · ${period === 90 ? "weekly" : "daily"} buckets · events, not unique leads.`}
          />
          <OutreachActivityChart
            data={data.outreachActivity}
            error={data.outreachError}
          />
        </Card>

        <Card>
          <CardHeader
            title="Leads by Niche"
            description="Top business categories among all currently saved leads; each lead counted once."
          />
          <LeadsByNicheChart
            data={current?.niches ?? null}
            error={data.currentError}
          />
        </Card>
      </div>
    </>
  );
}

function AnalyticsActions({ selected }: { selected: AnalyticsPeriod }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href="/ai-assistant"
        className="inline-flex rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-white hover:opacity-90"
      >
        Ask AI about your sales data
      </Link>
      <PeriodSelector selected={selected} />
    </div>
  );
}

function PeriodSelector({ selected }: { selected: AnalyticsPeriod }) {
  return (
    <nav aria-label="Analytics date range" className="flex shrink-0 flex-wrap gap-1">
      {PERIODS.map((period) => {
        const active = selected === period;
        return (
          <Link
            key={period}
            href={`/analytics?range=${period}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
              active
                ? "border-primary bg-primary/15 text-foreground"
                : "border-line text-muted hover:bg-field hover:text-foreground"
            }`}
          >
            {`Last ${period} days`}
          </Link>
        );
      })}
    </nav>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null;
  note: string;
}) {
  return (
    <Card className="motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-primary/40 motion-safe:hover:shadow-[0_6px_18px_rgba(0,0,0,.12)]">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-bold">{value ?? "—"}</p>
      <p className="mt-0.5 text-[11px] text-faint">{note}</p>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading analytics…</span>
      <PageHeader
        title="Analytics"
        description="Historical charts use the selected range; summary cards show lifetime or current-state metrics."
        action={
          <div aria-hidden="true" className="flex gap-1">
            {PERIODS.map((period) => (
              <span
                key={period}
                className="h-6 w-[74px] animate-pulse rounded-full border border-line bg-field"
              />
            ))}
          </div>
        }
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item}>
              <div className="h-4 w-24 animate-pulse rounded bg-field" />
              <div className="mt-2 h-7 w-14 animate-pulse rounded bg-field" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-field" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          {[0, 1].map((item) => (
            <Card key={item}>
              <div className="mb-3 h-4 w-36 animate-pulse rounded bg-field" />
              <div className="h-[280px] animate-pulse rounded-xl bg-field" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[0, 1].map((item) => (
            <Card key={item}>
              <div className="mb-3 h-4 w-36 animate-pulse rounded bg-field" />
              <div className="h-[280px] animate-pulse rounded-xl bg-field" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
