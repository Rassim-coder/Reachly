import { Suspense } from "react";
import Link from "next/link";

import { connection } from "next/server";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import { parseAnalyticsRange, type AnalyticsSearchParams } from "@/features/analytics/analytics";
import { LeadsOverTimeChart } from "@/features/analytics/components/leads-over-time-chart";
import { getAnalyticsSnapshot } from "@/features/analytics/queries";
import {
  Card,
  CardHeader,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";

type AnalyticsPageProps = {
  searchParams?: Promise<AnalyticsSearchParams>;
};

/**
 * Analytics overview for the signed-in user.
 *
 * Snapshot cards describe current state. The selected date range only filters
 * the Leads Over Time chart, because there is currently no reliable contact-
 * event history to plot.
 */
export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams?: Promise<AnalyticsSearchParams>;
}) {
  // `new Date()` inside `parseAnalyticsRange` is intentionally request-time
  // data, so the page must not attempt to prerender that value.
  await connection();
  const search = await searchParams;
  const range = parseAnalyticsRange(search ?? {});

  if (!range) {
    return (
      <DashboardPage>
        <PageHeader title="Analytics" />
        <Card>
          <EmptyState
            title="Invalid date range"
            description="Use an inclusive YYYY-MM-DD range, with the start date before the end date."
          />
        </Card>
      </DashboardPage>
    );
  }

  const result = await getAnalyticsSnapshot(range);

  if (!result.ok) {
    return (
      <DashboardPage>
        <PageHeader title="Analytics" />
        <Card>
          <EmptyState
            title="Could not load analytics"
            description={result.message}
          />
        </Card>
      </DashboardPage>
    );
  }

  const snapshot = result.snapshot;

  if (snapshot.savedLeads === 0) {
    return (
      <DashboardPage>
        <PageHeader title="Analytics" />
        <EmptyState
          title="No analytics yet"
          description="Save businesses as leads to see pipeline and follow-up metrics here."
          action={
            <Link
              href="/find-businesses"
              className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
            >
              Find businesses <ArrowUpRightIcon size={11} />
            </Link>
          }
        />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <PageHeader
        title="Analytics"
        description="Current pipeline, saved leads, and follow-up load."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Leads Saved"
          value={snapshot.savedLeads}
          note="All-time total"
        />
        <MetricCard
          label="Contacted Leads"
          value={snapshot.contactedLeads}
          note="Currently status = contacted"
        />
        <MetricCard
          label="Interested Leads"
          value={snapshot.interestedLeads}
          note="Current state"
        />
        <MetricCard
          label="Follow-ups Due"
          value={snapshot.followUpsDue}
          note="Today or earlier"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader
              title="Leads Over Time"
              description="New saved leads by selected bucket"
            />
            <LeadsOverTimeChart data={snapshot.overTime} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="Pipeline" description="Leads by current status" />
            <ul className="space-y-2">
              {snapshot.pipeline.map((item) => (
                <li key={item.status} className="flex items-center justify-between">
                  <span className="text-[12px] text-muted">{item.label}</span>
                  <span className="text-[12px] font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Leads by Niche" description="Business category" />
            <ul className="space-y-2">
              {snapshot.niches.map((item) => (
                <li key={item.category} className="flex items-center justify-between">
                  <span className="text-[12px] text-muted">{item.label}</span>
                  <span className="text-[12px] font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <Card>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] text-faint">{note}</p>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <Card key={index}>
          <div className="h-4 w-24 rounded bg-field" />
          <div className="h-7 w-16 rounded bg-field" />
          <div className="h-3 w-20 rounded bg-field" />
        </Card>
      ))}
    </div>
  );
}
