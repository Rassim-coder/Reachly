import { PageHeader, DashboardPage } from "@/components/ui/page-shell";
import { BusinessSearch } from "@/features/businesses/components/business-search";

export default function FindBusinessesPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="Find Businesses"
        description="Search real businesses from Overture Maps by niche and location."
      />
      <BusinessSearch />
    </DashboardPage>
  );
}
