import Link from "next/link";

import { PageHeader } from "@/components/ui/page-shell";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title="List" description={`List ${listId}`} />

      <div className="rounded-lg border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <p className="text-sm font-medium">Not implemented yet</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This route exists but does not load a list or its leads.
        </p>
      </div>

      <Link
        href="/lists"
        className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Back to Lists
      </Link>
    </div>
  );
}
