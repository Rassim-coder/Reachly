import { Suspense } from "react";

import { DashboardPage } from "@/components/ui/page-shell";
import { ListDetailContent } from "@/features/lists/components/list-detail-content";
import { ListsSkeleton } from "@/features/lists/components/lists-skeleton";

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  return (
    <DashboardPage>
      <Suspense fallback={<ListsSkeleton label="Loading the list…" />}>
        <ListDetailContent params={params} />
      </Suspense>
    </DashboardPage>
  );
}