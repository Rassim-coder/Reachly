import { Card } from "@/components/ui/page-shell";

export function TemplatesSkeleton() {
  return (
    <Card>
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your templates…</span>
        <div
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          aria-hidden="true"
        >
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-36 animate-pulse rounded-xl bg-field" />
          ))}
        </div>
      </div>
    </Card>
  );
}