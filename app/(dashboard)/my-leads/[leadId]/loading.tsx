import { Card, DashboardPage } from "@/components/ui/page-shell";

/**
 * Request-scoped lead detail route loading state. It mirrors the detail layout
 * without inventing lead content while the authenticated query is in flight.
 */
export default function LeadDetailLoading() {
  return (
    <DashboardPage>
      <div className="mb-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading lead details…</span>
        <div className="h-6 w-56 animate-pulse rounded bg-field" aria-hidden="true" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-field" aria-hidden="true" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <div className="space-y-4" aria-hidden="true">
            <div className="h-4 w-32 animate-pulse rounded bg-field" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="space-y-1.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-field" />
                  <div className="h-3.5 w-36 animate-pulse rounded bg-field" />
                </div>
              ))}
            </div>
            <div className="h-24 animate-pulse rounded-xl bg-field" />
          </div>
        </Card>

        <Card>
          <div className="space-y-3" aria-hidden="true">
            <div className="h-4 w-20 animate-pulse rounded bg-field" />
            <div className="h-20 animate-pulse rounded-xl bg-field" />
            <div className="h-20 animate-pulse rounded-xl bg-field" />
          </div>
        </Card>
      </div>
    </DashboardPage>
  );
}
