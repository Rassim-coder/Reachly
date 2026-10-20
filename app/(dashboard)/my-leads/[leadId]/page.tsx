import Link from "next/link";

import { PageHeader } from "@/components/ui/page-shell";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Lead details"
        description={`Lead ${leadId}`}
      />

      <div className="rounded-lg border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <p className="text-sm font-medium">Not implemented yet</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This route exists but does not load a lead. The identifier above comes
          from the URL only.
        </p>
      </div>

      <Link
        href="/my-leads"
        className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Back to My Leads
      </Link>
    </div>
  );
}
