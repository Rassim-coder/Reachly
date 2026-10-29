import Link from "next/link";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import { Card, CardHeader, EmptyState } from "@/components/ui/page-shell";
import { StatusBadge } from "@/features/leads/components/lead-list";

import { OverviewLeadsOverTimeChart } from "./overview-leads-over-time-chart";
import type { OverviewData } from "../overview";

export function OverviewPanels({ data }: { data: OverviewData }) {
  return (
    <div className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-[18px]">
        <Card>
          <CardHeader
            title="Leads Over Time"
            description="Leads saved and marked Contacted per month · last 6 calendar months"
          />
          <OverviewLeadsOverTimeChart
            data={data.monthlyTrends}
            contactedError={data.contactedHistoryError}
          />
        </Card>

        <Card>
          <CardHeader
            title="Recent Leads"
            description="Latest businesses you saved"
            action={<ViewLink href="/my-leads" label="View all" />}
          />
          {data.recentLeads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description="Businesses you save from Find Businesses will appear here, newest first."
              action={
                <Link
                  href="/find-businesses"
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
                >
                  Find businesses <ArrowUpRightIcon size={11} />
                </Link>
              }
            />
          ) : (
            <ul className="space-y-1">
              {data.recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/my-leads/${lead.id}`}
                    className="flex min-w-0 items-start justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-field"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="max-w-full truncate text-[13px] font-semibold text-foreground">
                          {lead.businessName}
                        </span>
                        <StatusBadge status={lead.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {[lead.category, lead.location]
                          .filter((value): value is string => Boolean(value))
                          .join(" · ") || "Category and location unavailable"}
                      </p>
                    </div>
                    <time
                      dateTime={lead.createdAt}
                      className="shrink-0 pt-0.5 text-[10px] text-faint"
                    >
                      {lead.relativeCreatedAt}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-[18px]">
        <Card>
          <CardHeader
            title="Pipeline"
            description="All saved leads by current status"
            action={<ViewLink href="/my-leads" label="View leads" />}
          />
          {data.stats.savedLeads === 0 ? (
            <EmptyState
              title="No pipeline yet"
              description="The status breakdown appears once you have saved leads."
            />
          ) : (
            <>
              <div
                role="img"
                aria-label={data.pipeline
                  .map((item) => `${item.label}: ${item.count}`)
                  .join(", ")}
                className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-field"
              >
                {data.pipeline.filter((item) => item.count > 0).map((item) => (
                  <span
                    key={item.status}
                    title={`${item.label}: ${item.count}`}
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {data.pipeline.map((item) => (
                  <li key={item.status} className="flex min-w-0 items-center gap-2 text-[11px]">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Follow-ups Due"
            description="Next outstanding follow-ups"
            action={<ViewLink href="/follow-ups" label="View all" />}
          />
          {data.followUpNotesWarning ? (
            <p role="status" className="mb-2 text-[11px] text-amber-300">
              {data.followUpNotesWarning}
            </p>
          ) : null}
          {data.followUps.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Outstanding follow-ups you schedule on a lead show up here."
            />
          ) : (
            <ul className="space-y-1">
              {data.followUps.map((followUp) => (
                <li key={followUp.id}>
                  <Link
                    href={`/my-leads/${followUp.id}`}
                    className="block rounded-xl px-2.5 py-2 transition-colors hover:bg-field"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate text-[12px] font-semibold text-foreground">
                        {followUp.businessName}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-semibold ${
                          followUp.dueLabel === "Overdue"
                            ? "text-red-400"
                            : followUp.dueLabel === "Today"
                              ? "text-amber-300"
                              : "text-muted"
                        }`}
                      >
                        {followUp.dueLabel}
                      </span>
                    </div>
                    {followUp.latestNote ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                        <span className="text-faint">Latest note: </span>
                        {followUp.latestNote}
                      </p>
                    ) : (
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {[followUp.category, followUp.location]
                          .filter((value): value is string => Boolean(value))
                          .join(" · ") || "No note or location available"}
                      </p>
                    )}
                    <time
                      dateTime={followUp.dueDate}
                      className="mt-1 block text-[10px] text-faint"
                    >
                      {followUp.dueDateLabel}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Leads by Niche"
            description="Top categories among all saved leads"
            action={<ViewLink href="/my-leads" label="View leads" />}
          />
          {data.niches.length === 0 ? (
            <EmptyState
              title="No niches yet"
              description="Business categories appear here once your saved leads are classified."
            />
          ) : (
            <ul className="space-y-3">
              {data.niches.map((niche) => (
                <li key={niche.category}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate text-muted">{niche.label}</span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {niche.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-field">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${niche.percentage}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1 text-[12px] text-primary"
    >
      {label} <ArrowUpRightIcon size={11} />
    </Link>
  );
}
