import Link from "next/link";

import { Card, DashboardPage, EmptyState, PageHeader } from "@/components/ui/page-shell";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  return (
    <DashboardPage>
      <PageHeader title="List" description={`List ${listId}`} />

      <Card>
        <EmptyState
          title="Not implemented yet"
          description="This route exists but does not load a list or its leads."
        />
      </Card>

      <Link
        href="/lists"
        className="mt-4 w-fit text-[13px] text-muted underline-offset-4 hover:underline"
      >
        ← Back to Lists
      </Link>
    </DashboardPage>
  );
}