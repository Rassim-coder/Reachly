import { Suspense } from "react";

import {
  Card,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";

import { FollowUpsQueue } from "@/features/follow-ups/components/follow-ups-queue";
import { getFollowUpQueue } from "@/features/follow-ups/queries";

export default function FollowUpsPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="Follow-ups"
        description="Scheduled next steps, most urgent first."
      />

      <Suspense fallback={<FollowUpsSkeleton />}>
        <FollowUpsContent />
      </Suspense>
    </DashboardPage>
  );
}

async function FollowUpsContent() {
  const result = await getFollowUpQueue();

  if (!result.ok) {
    return (
      <Card>
        <div role="alert">
          <EmptyState
            title="Could not load follow-ups"
            description={result.message}
          />
        </div>
      </Card>
    );
  }

  return (
    <FollowUpsQueue
      initial={result.queue}
      notesWarning={result.notesWarning}
    />
  );
}

function FollowUpsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your follow-ups…</span>
      <div aria-hidden="true">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-[112px] animate-pulse rounded-2xl border border-line bg-field"
            />
          ))}
        </div>

        {[0, 1].map((section) => (
          <Card key={section} className="mb-4">
            <div className="mb-4 h-4 w-28 animate-pulse rounded bg-field" />
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-[92px] animate-pulse rounded-xl bg-field"
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
