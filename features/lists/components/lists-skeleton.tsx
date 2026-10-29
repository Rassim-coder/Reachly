import { Card } from "@/components/ui/page-shell";

export function ListsSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <Card>
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">{label}</span>
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-field" />
          ))}
        </div>
      </div>
    </Card>
  );
}