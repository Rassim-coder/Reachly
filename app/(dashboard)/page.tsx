import { Suspense } from "react";

import {
  Card,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";
import { OverviewPanels } from "@/features/overview/components/overview-panels";
import { getOverviewDashboardData } from "@/features/overview/queries";

import { Greeting } from "./greeting";
import { KpiSkeletonGrid, OverviewKpis } from "./overview-kpis";

export default function OverviewPage() {
  return (
    <DashboardPage>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </DashboardPage>
  );
}

async function OverviewContent() {
  const result = await getOverviewDashboardData();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Overview" description="Your prospecting workspace at a glance." />
        <Card>
          <EmptyState title="Could not load your Overview" description={result.message} />
        </Card>
      </>
    );
  }

  const { data } = result;

  return (
    <>
      <section className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#7c4dff_0%,#6d3ff0_40%,#fa7521_100%)] p-7 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.18)_1px,transparent_1px)] bg-[length:18px_18px] opacity-50"
        />
        <div className="relative z-1">
          <h1 className="text-[26px] font-bold tracking-tight">
            <Greeting />
          </h1>
          <p className="mt-1 mb-[22px] opacity-80">
            Here’s where your pipeline stands today.
          </p>
          <OverviewKpis stats={data.stats} />
        </div>
      </section>

      <OverviewPanels data={data} />
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-[18px]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your Overview…</span>
      <section className="rounded-[20px] bg-[linear-gradient(135deg,#7c4dff_0%,#6d3ff0_40%,#fa7521_100%)] p-7 text-white">
        <div className="mb-2 h-7 w-56 animate-pulse rounded bg-white/25" />
        <div className="mb-5 h-4 w-64 animate-pulse rounded bg-white/20" />
        <KpiSkeletonGrid />
      </section>
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <div className="space-y-[18px]">
          {[0, 1].map((item) => (
            <Card key={item}>
              <div className="mb-3 h-4 w-36 animate-pulse rounded bg-field" />
              <div className="h-[240px] animate-pulse rounded-xl bg-field" />
            </Card>
          ))}
        </div>
        <div className="space-y-[18px]">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <div className="mb-3 h-4 w-36 animate-pulse rounded bg-field" />
              <div className="h-[110px] animate-pulse rounded-xl bg-field" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
