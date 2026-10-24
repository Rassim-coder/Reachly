import { Card, CardHeader } from "@/components/ui/page-shell";

import {
  displayWebsite,
  formatLeadDate,
  isHttpUrl,
  leadStatusLabel,
  type LeadListItem,
  type LeadStatus,
} from "../lead-list";

const statusStyles: Record<LeadStatus, string> = {
  new: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  to_contact: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  contacted: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  interested: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  not_interested: "border-red-500/40 bg-red-500/10 text-red-300",
  follow_up: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}
    >
      {leadStatusLabel(status)}
    </span>
  );
}

function ContactDetails({ lead }: { lead: LeadListItem }) {
  const hasContactDetails = Boolean(lead.phone || lead.email || lead.website);

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
      {lead.phone ? (
        <a className="hover:text-ink" href={`tel:${lead.phone}`}>
          {lead.phone}
        </a>
      ) : null}
      {lead.email ? (
        <a className="hover:text-ink" href={`mailto:${lead.email}`}>
          {lead.email}
        </a>
      ) : null}
      {lead.website ? (
        isHttpUrl(lead.website) ? (
          <a
            className="hover:text-ink"
            href={lead.website}
            target="_blank"
            rel="noreferrer"
          >
            {displayWebsite(lead.website)}
          </a>
        ) : (
          <span>{displayWebsite(lead.website)}</span>
        )
      ) : null}
      {!hasContactDetails ? (
        <span className="text-faint">No contact details available</span>
      ) : null}
    </div>
  );
}

export function LeadList({ leads }: { leads: LeadListItem[] }) {
  return (
    <Card>
      <CardHeader
        title={`${leads.length} saved ${leads.length === 1 ? "lead" : "leads"}`}
        description="Newest saved first."
      />

      <ul className="divide-y divide-line">
        {leads.map((lead) => (
          <li
            key={lead.id}
            className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold">{lead.businessName}</p>
                <StatusBadge status={lead.status} />
              </div>

              {lead.location ? (
                <p className="mt-0.5 text-[12px] text-muted">{lead.location}</p>
              ) : null}

              <ContactDetails lead={lead} />

              <p className="mt-1.5 text-[11px] text-faint">
                Saved {formatLeadDate(lead.createdAt) ?? "—"}
              </p>
            </div>

            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:text-right">
              <div>
                <dt className="text-faint">Last contact</dt>
                <dd className="text-muted">
                  {formatLeadDate(lead.lastContactedAt) ?? "Not contacted"}
                </dd>
              </div>
              <div>
                <dt className="text-faint">Next follow-up</dt>
                <dd className="text-muted">
                  {formatLeadDate(lead.nextFollowUpDate) ?? "Not scheduled"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Shown while the request-scoped lead query is in flight. It reserves the same
 * card and row shape as the loaded list without displaying invented content.
 */
export function LeadListSkeleton() {
  return (
    <Card>
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your leads…</span>
        <div className="mb-4" aria-hidden="true">
          <div className="h-4 w-36 animate-pulse rounded bg-field" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-field" />
        </div>
        <div className="space-y-4" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-48 animate-pulse rounded bg-field" />
                <div className="h-3 w-64 animate-pulse rounded bg-field" />
                <div className="h-3 w-40 animate-pulse rounded bg-field" />
              </div>
              <div className="h-8 w-40 animate-pulse rounded bg-field" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
