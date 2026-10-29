import { Suspense } from "react";

import { DashboardPage, PageHeader } from "@/components/ui/page-shell";
import { ListsContent } from "@/features/lists/components/lists-content";
import { ListsSkeleton } from "@/features/lists/components/lists-skeleton";

export default function ListsPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="Lists"
        description="Organize saved leads into groups."
      />
      <Suspense fallback={<ListsSkeleton label="Loading your lists…" />}>
        <ListsContent />
      </Suspense>
    </DashboardPage>
  );
}