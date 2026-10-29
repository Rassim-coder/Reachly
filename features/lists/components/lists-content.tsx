import { Card, EmptyState } from "@/components/ui/page-shell";

import { getMyLists } from "../queries";
import { ListManager } from "./list-manager";

export async function ListsContent() {
  const result = await getMyLists();

  if (!result.ok) {
    return (
      <Card>
        <EmptyState title="Could not load your lists" description={result.message} />
      </Card>
    );
  }

  return <ListManager lists={result.lists} />;
}