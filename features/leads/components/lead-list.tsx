import { Card } from "@/components/ui/page-shell";

import {
  formatLeadDate,
  getLeadFollowUpState,
  leadFollowUpLabel,
  leadStatusLabel,
  type LeadFollowUpState,
  type LeadListItem,
  type LeadStatus,
} from "../lead-list";
import { getPageSelectionState } from "../lead-selection";

const statusStyles: Record<LeadStatus, string> = {
  new: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  to_contact: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  contacted: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  interested: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  not_interested: "border-red-500/40 bg-red-500/10 text-red-300",
  follow_up: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

const followUpStyles: Record<LeadFollowUpState, string> = {
  overdue: "text-red-400",
  today: "text-amber-300",
  upcoming: "text-emerald-400",
  none: "text-faint",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}
    >
      {leadStatusLabel(status)}
    </span>
  );
}

export function FollowUpLabel({
  date,
  withDate = false,
}: {
  date: string | null;
  withDate?: boolean;
}) {
  const state = getLeadFollowUpState(date);

  if (state === "none") {
    return <span className="text-[12px] text-faint">Not scheduled</span>;
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      {withDate ? (
        <span className="text-[12px] text-muted">
          {formatLeadDate(date) ?? "Unknown date"}
        </span>
      ) : null}
      <span className={`text-[11px] font-medium ${followUpStyles[state]}`}>
        {leadFollowUpLabel(state)}
      </span>
    </span>
  );
}

export function LeadTable({
  leads,
  selectedIds,
  onSelect,
  onToggleSelected,
  onTogglePage,
}: {
  leads: LeadListItem[];
  selectedIds: ReadonlySet<string>;
  onSelect: (leadId: string) => void;
  onToggleSelected: (leadId: string) => void;
  onTogglePage: (checked: boolean) => void;
}) {
  const pageIds = leads.map((lead) => lead.id);
  const pageSelection = getPageSelectionState(selectedIds, pageIds);

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[840px] border-collapse text-left">
        <caption className="sr-only">
          Saved leads with status and follow-up dates
        </caption>
        <thead>
          <tr className="border-b border-line bg-field/60 text-[10px] font-medium tracking-[.06em] text-faint uppercase">
            <th scope="col" className="w-10 px-3 py-2.5 font-medium">
              <input
                type="checkbox"
                checked={pageSelection === "all"}
                ref={(element) => {
                  if (element) element.indeterminate = pageSelection === "some";
                }}
                onChange={(event) => onTogglePage(event.target.checked)}
                disabled={leads.length === 0}
                aria-label="Select all leads on this page"
                className="size-4 cursor-pointer rounded border-line accent-[#6d3ff0] disabled:cursor-not-allowed"
              />
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Business
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Niche
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Location
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Added
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Next follow-up
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((lead) => {
            const isSelected = selectedIds.has(lead.id);

            return (
              <tr
                key={lead.id}
                tabIndex={0}
                aria-label={`Open details for ${lead.businessName}`}
                onClick={() => onSelect(lead.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(lead.id);
                  }
                }}
                className={`cursor-pointer transition-colors hover:bg-field/60 focus-visible:bg-field focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                  isSelected ? "bg-primary/5" : ""
                }`}
              >
                <td
                  className="w-10 px-3 py-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelected(lead.id)}
                    aria-label={`Select ${lead.businessName}`}
                    className="size-4 cursor-pointer rounded border-line accent-[#6d3ff0]"
                  />
                </td>
                <td className="px-3 py-3">
                  <span className="block max-w-[240px] truncate text-[13px] font-semibold">
                    {lead.businessName}
                  </span>
                  {lead.phone ? (
                    <span className="mt-0.5 block max-w-[240px] truncate text-[11px] text-muted">
                      {lead.phone}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-[12px] text-muted">
                  {lead.category ?? "—"}
                </td>
                <td className="max-w-[220px] px-3 py-3 text-[12px] text-muted">
                  <span className="line-clamp-2">{lead.location ?? "—"}</span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-3 py-3 text-[12px] whitespace-nowrap text-muted">
                  {formatLeadDate(lead.createdAt) ?? "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <FollowUpLabel date={lead.nextFollowUpDate} withDate />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Shown while the request-scoped lead query is in flight. It reserves the same
 * card and table shape as the loaded list without displaying invented content.
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
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-field" />
          ))}
        </div>
      </div>
    </Card>
  );
}
