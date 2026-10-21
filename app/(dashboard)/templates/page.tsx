import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function TemplatesPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="Templates"
        description="Reusable outreach messages."
        planned={[
          "Create, edit, and delete user-owned templates.",
          "Copy a template to the clipboard.",
          "Substitute {name}, {business}, and {city} from lead data when available.",
        ]}
      />
    </DashboardPage>
  );
}