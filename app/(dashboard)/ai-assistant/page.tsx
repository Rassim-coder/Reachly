import { PendingFeature } from "@/components/ui/page-shell";

export default function AiAssistantPage() {
  return (
    <div className="p-6">
      <PendingFeature
        title="AI Assistant"
        description="Lead qualification and outreach drafts."
        planned={[
          "Server-side model integration — credentials never reach the browser.",
          "Lead scoring and outreach drafting.",
          "AI suggestions kept clearly distinguishable from verified business data.",
        ]}
      />
    </div>
  );
}
