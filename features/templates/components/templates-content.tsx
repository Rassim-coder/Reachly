import { Card, EmptyState } from "@/components/ui/page-shell";

import { getMyTemplates } from "../queries";
import { TemplateManager } from "./template-manager";

export async function TemplatesContent() {
  const result = await getMyTemplates();

  if (!result.ok) {
    return (
      <Card>
        <EmptyState
          title="Could not load your templates"
          description={result.message}
        />
      </Card>
    );
  }

  return <TemplateManager templates={result.templates} />;
}