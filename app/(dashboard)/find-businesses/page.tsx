import { DashboardPage, PendingFeature } from "@/components/ui/page-shell";

export default function FindBusinessesPage() {
  return (
    <DashboardPage>
      <PendingFeature
        title="Find Businesses"
        description="Search for businesses by niche and location."
        planned={[
          "Server-side Overture search through DuckDB.",
          "Normalized business results with nullable contact details.",
          "Save a business as a personal lead.",
        ]}
      />
    </DashboardPage>
  );
}