import { Suspense } from "react";
import Link from "next/link";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import {
  Card,
  CardHeader,
  DashboardPage,
  EmptyState,
} from "@/components/ui/page-shell";

import { Greeting } from "./greeting";
import { KpiSkeletonGrid, OverviewKpis } from "./overview-kpis";

export default function OverviewPage() {
  return (
    <DashboardPage>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#7c4dff_0%,#6d3ff0_40%,#0a8fe0_100%)] p-7 text-white">
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

          <Suspense fallback={<KpiSkeletonGrid />}>
            <OverviewKpis />
          </Suspense>
        </div>
      </section>

      {/* ---------- Cards ---------- */}
      <div className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card>
            <CardHeader
              title="Leads Over Time"
              description="Leads saved and contacted per month"
            />
            <EmptyState
              title="Not enough data yet"
              description="The monthly chart appears once you have saved leads across more than one month."
            />
          </Card>

          <Card>
            <CardHeader
              title="Recent Leads"
              description="Latest businesses you saved"
              action={
                <Link
                  href="/my-leads"
                  className="flex items-center gap-1 text-[12px] text-primary"
                >
                  View all <ArrowUpRightIcon size={11} />
                </Link>
              }
            />
            <EmptyState
              title="No leads yet"
              description="Businesses you save will appear here, newest first."
              action={
                <Link
                  href="/find-businesses"
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
                >
                  Find businesses <ArrowUpRightIcon size={11} />
                </Link>
              }
            />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card>
            <CardHeader
              title="Pipeline"
              description="Leads by status"
              action={
                <Link
                  href="/my-leads"
                  className="flex items-center gap-1 text-[12px] text-primary"
                >
                  View leads <ArrowUpRightIcon size={11} />
                </Link>
              }
            />
            <EmptyState
              title="No pipeline yet"
              description="The status breakdown appears once you have saved leads."
            />
          </Card>

          <Card>
            <CardHeader
              title="Follow-ups Due"
              description="Next on your list"
              action={
                <Link
                  href="/follow-ups"
                  className="flex items-center gap-1 text-[12px] text-primary"
                >
                  View all <ArrowUpRightIcon size={11} />
                </Link>
              }
            />
            <EmptyState
              title="Nothing scheduled"
              description="Follow-ups you schedule on a lead show up here."
            />
          </Card>

          <Card>
            <CardHeader
              title="Leads by Niche"
              description="Share of your saved leads"
              action={
                <Link
                  href="/lists"
                  className="flex items-center gap-1 text-[12px] text-primary"
                >
                  Lists <ArrowUpRightIcon size={11} />
                </Link>
              }
            />
            <EmptyState
              title="No niches yet"
              description="Niche categories appear here once your saved leads are classified."
            />
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}