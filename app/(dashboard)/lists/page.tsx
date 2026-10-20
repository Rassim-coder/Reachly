import { PendingFeature } from "@/components/ui/page-shell";

export default function ListsPage() {
  return (
    <div className="p-6">
      <PendingFeature
        title="Lists"
        description="Organize saved leads into groups."
        planned={[
          "Create and open a list.",
          "Add and remove the user's own leads.",
          "Counts and contacted progress calculated from real data.",
        ]}
      />
    </div>
  );
}
