import type { ReactNode } from "react";

/**
 * Consistent header for dashboard pages.
 * Presentation only — contains no data access.
 */
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
    </header>
  );
}

/**
 * Placeholder body for screens whose backend work has not been implemented.
 *
 * These pages render intentionally empty rather than showing mock data, so a
 * page never implies functionality that does not exist yet (see AGENTS.md
 * "Status Terminology" and PROJECT_BRIEF.md §6).
 */
export function PendingFeature({
  title,
  description,
  planned,
}: {
  title: string;
  description: string;
  planned?: string[];
}) {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <PageHeader title={title} description={description} />

      <div className="rounded-lg border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <p className="text-sm font-medium">Not implemented yet</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This screen is a routing placeholder. It contains no real data and
          performs no backend operations.
        </p>

        {planned && planned.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function DashboardPage({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>;
}
