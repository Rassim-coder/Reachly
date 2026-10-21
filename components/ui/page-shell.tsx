import type { ReactNode } from "react";

/**
 * Consistent header for dashboard pages, matching the page title block in
 * `reference/Reachly Dashboard (1).html`. Presentation only — contains no
 * data access.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

/**
 * Card surface used across the dashboard.
 */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-4 shadow-card ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

/**
 * Card title row: heading, optional description, optional trailing action.
 */
export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description ? <p className="text-[12px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Empty state for panels whose data source is not connected yet.
 *
 * These screens render intentionally empty rather than showing mock numbers,
 * so a page never implies functionality that does not exist yet (see
 * AGENTS.md "Status Terminology" and PROJECT_BRIEF.md §6).
 */
export function EmptyState({
  title,
  description,
  planned,
  action,
}: {
  title: string;
  description: string;
  planned?: string[];
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4">
      <p className="text-[13px] font-medium">{title}</p>
      <p className="mt-1 text-[12px] text-muted">{description}</p>

      {planned && planned.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-muted">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {action}
    </div>
  );
}

/**
 * Placeholder body for screens whose backend work has not been implemented.
 */
export function PendingFeature({
  title,
  description,
  planned,
  action,
}: {
  title: string;
  description: string;
  planned?: string[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={title} description={description} action={action} />

      <Card>
        <EmptyState
          title="Not implemented yet"
          description="This screen is a routing placeholder. It contains no real data and performs no backend operations."
          planned={planned}
        />
      </Card>
    </div>
  );
}

export function DashboardPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 lg:p-[18px]">{children}</div>
  );
}