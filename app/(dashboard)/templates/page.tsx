import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/ui/page-shell";
import { TemplatesContent } from "@/features/templates/components/templates-content";
import { TemplatesSkeleton } from "@/features/templates/components/template-skeleton";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Templates"
        description="Reusable email and WhatsApp drafts. Personalize one from any saved lead, copy it, and send it yourself."
      />

      <Suspense fallback={<TemplatesSkeleton />}>
        <TemplatesContent />
      </Suspense>
    </div>
  );
}