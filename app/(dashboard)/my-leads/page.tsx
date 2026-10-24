import { Suspense } from "react";
import Link from "next/link";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import {
  Card,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";

import { LeadList, LeadListSkeleton } from "@/features/leads/components/lead-list";
import { getMyLeads } from "@/features/leads/queries";

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
  const result = await getMyLeads();

  if (!result.ok) {
    return (
      <Card>
        <div role="alert">
          <EmptyState title="Could not load leads" description={result.message} />
        </div>
      </Card>
    );
  }

  if (result.leads.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No leads yet"
          description="Businesses you save from Find Businesses will appear here, newest first."
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
    );
  }

  return <LeadList leads={result.leads} />;
}
