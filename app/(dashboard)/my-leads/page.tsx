import { Suspense } from "react";

import {
  Card,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";

import { LeadListSkeleton } from "@/features/leads/components/lead-list";
import { LeadWorkspace } from "@/features/leads/components/lead-workspace";
import { DEFAULT_LEAD_FILTERS } from "@/features/leads/lead-filters";
import { getMyLeadsPage } from "@/features/leads/queries";

export default function MyLeadsPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="My Leads"
        description="The businesses you have saved, with status and follow-up dates."
      />

      <Suspense fallback={<LeadListSkeleton />}>
        <MyLeadsContent />
      </Suspense>
    </DashboardPage>
  );
}

async function MyLeadsContent() {
  const result = await getMyLeadsPage(DEFAULT_LEAD_FILTERS);

  if (!result.ok) {
    return (
      <Card>
        <div role="alert">
          <EmptyState title="Could not load leads" description={result.message} />
        </div>
      </Card>
    );
  }

  return <LeadWorkspace initial={result} />;
}
