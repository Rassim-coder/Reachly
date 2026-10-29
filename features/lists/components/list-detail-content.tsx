import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";

import { getListWithLeads } from "../queries";
import { ListLeadsWorkspace } from "./list-leads-workspace";

export async function ListDetailContent({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const result = await getListWithLeads(listId);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();

    return (
      <Card>
        <EmptyState title="Could not load this list" description={result.message} />
      </Card>
    );
  }

  const count = result.leads.length;

  return (
    <>
      <PageHeader
        title={result.list.name}
        description={`${count} ${count === 1 ? "lead" : "leads"} in this list.`}
      />

      <ListLeadsWorkspace listId={result.list.id} leads={result.leads} />

      <Link
        href="/lists"
        className="mt-4 w-fit text-[13px] text-muted underline-offset-4 hover:underline"
      >
        ← Back to Lists
      </Link>
    </>
  );
}