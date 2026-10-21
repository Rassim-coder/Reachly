import Link from "next/link";

import { Card, DashboardPage, EmptyState, PageHeader } from "@/components/ui/page-shell";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  return (
    <DashboardPage>
      <PageHeader title="Lead details" description={`Lead ${leadId}`} />

      <Card>
        <EmptyState
          title="Not implemented yet"
          description="This route exists but does not load a lead. The identifier above comes from the URL only."
        />
      </Card>

      <Link
        href="/my-leads"
        className="mt-4 w-fit text-[13px] text-muted underline-offset-4 hover:underline"
      >
        ← Back to My Leads
      </Link>
    </DashboardPage>
  );
}