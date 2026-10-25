"use client";

import Link from "next/link";
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import {
  Card,
  CardHeader,
  EmptyState,
} from "@/components/ui/page-shell";

import { loadMyLeads } from "../list-actions";
import {
  DEFAULT_LEAD_FILTERS,
  hasActiveLeadFilters,
  type LeadFollowUpFilter,
  type LeadListFilters,
  type LeadSort,
} from "../lead-filters";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "../lead-list";
import type { MyLeadsSuccess } from "../queries";
import { LeadDrawer } from "./lead-drawer";
import { LeadTable } from "./lead-list";

const fieldClasses =
  "h-[34px] w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const filterButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const secondaryButtonClasses =
  "inline-flex h-[32px] items-center justify-center rounded-full border border-line bg-surface px-3.5 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

const followUpOptions: Array<{
  value: LeadFollowUpFilter;
  label: string;
}> = [
  { value: "all", label: "All follow-ups" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "Not scheduled" },
];

const sortOptions: Array<{ value: LeadSort; label: string }> = [
  { value: "newest", label: "Newest added" },
  { value: "oldest", label: "Oldest added" },
  { value: "follow_up_asc", label: "Follow-up soonest" },
  { value: "follow_up_desc", label: "Follow-up latest" },
];

export function LeadWorkspace({ initial }: { initial: MyLeadsSuccess }) {
  const [result, setResult] = useState<MyLeadsSuccess>(initial);
  const [filters, setFilters] = useState<LeadListFilters>(initial.filters);
  const [searchDraft, setSearchDraft] = useState(initial.filters.search);
  const [categoryDraft, setCategoryDraft] = useState(initial.filters.category);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryPending, startQueryTransition] = useTransition();
  const requestId = useRef(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const closeDrawer = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  function runQuery(nextFilters: LeadListFilters): void {
    const currentRequest = ++requestId.current;
    setQueryError(null);

    startQueryTransition(async () => {
      const next = await loadMyLeads(nextFilters);

      if (currentRequest !== requestId.current) return;

      if (!next.ok) {
        setQueryError(next.message);
        return;
      }

      if (next.page > next.pageCount) {
        runQuery({ ...next.filters, page: next.pageCount });
        return;
      }

      setResult(next);
      setFilters(next.filters);
      setSearchDraft(next.filters.search);
      setCategoryDraft(next.filters.category);
    });
  }

  function applyControls(partial: Partial<LeadListFilters>): void {
    runQuery({
      ...filters,
      ...partial,
      search: searchDraft,
      category: categoryDraft,
      page: partial.page ?? 1,
    });
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyControls({});
  }

  function handleClearFilters() {
    setSearchDraft("");
    setCategoryDraft("");
    runQuery({ ...DEFAULT_LEAD_FILTERS });
  }

  const firstItem =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastItem = Math.min(
    result.page * result.pageSize,
    result.total,
  );
  const appliedFiltersAreActive = hasActiveLeadFilters(result.filters);
  const filtersAreActive =
    appliedFiltersAreActive ||
    searchDraft.trim() !== "" ||
    categoryDraft.trim() !== "";

  return (
    <>
      <Card className="mb-4">
        <form
          onSubmit={handleFilterSubmit}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1.5fr)_minmax(150px,1fr)_150px_160px_170px_auto]"
        >
          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Search business
            </span>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              maxLength={100}
              placeholder="Business name"
              className={fieldClasses}
            />
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Niche/category
            </span>
            <input
              type="search"
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              maxLength={100}
              placeholder="e.g. Dental clinic"
              className={fieldClasses}
            />
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Status
            </span>
            <select
              value={result.filters.status}
              onChange={(event) =>
                applyControls({
                  status: event.target.value as LeadStatus | "all",
                })
              }
              className={fieldClasses}
            >
              <option value="all">All statuses</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Follow-up
            </span>
            <select
              value={result.filters.followUp}
              onChange={(event) =>
                applyControls({
                  followUp: event.target.value as LeadFollowUpFilter,
                })
              }
              className={fieldClasses}
            >
              {followUpOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Sort by
            </span>
            <select
              value={result.filters.sort}
              onChange={(event) =>
                applyControls({
                  sort: event.target.value as LeadSort,
                })
              }
              className={fieldClasses}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1">
            <button
              type="submit"
              disabled={queryPending}
              className={filterButtonClasses}
            >
              {queryPending ? "Loading…" : "Apply"}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={queryPending && !filtersAreActive}
              className={secondaryButtonClasses}
            >
              Clear
            </button>
          </div>
        </form>
      </Card>

      {queryError ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12px] text-red-300"
        >
          {queryError}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={
            result.total === 0
              ? "My leads"
              : `${result.total} saved ${result.total === 1 ? "lead" : "leads"}`
          }
          description={
            result.total === 0
              ? appliedFiltersAreActive
                ? "No saved leads match the current view."
                : "Saved leads will appear here."
              : `Showing ${firstItem}–${lastItem} of ${result.total}.`
          }
          action={
            queryPending ? (
              <span className="text-[11px] text-faint" role="status">
                Updating…
              </span>
            ) : null
          }
        />

        <div
          aria-busy={queryPending}
          className={queryPending ? "opacity-60 transition-opacity" : undefined}
        >
          {result.leads.length === 0 ? (
            appliedFiltersAreActive ? (
              <EmptyState
                title="No leads match these filters"
                description="Try a different business name, niche, status, or follow-up view."
                action={
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className={`${secondaryButtonClasses} mt-3`}
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <EmptyState
                title="No leads yet"
                description="Businesses you save from Find Businesses will appear here."
                action={
                  <Link
                    href="/find-businesses"
                    className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
                  >
                    Find businesses <ArrowUpRightIcon size={11} />
                  </Link>
                }
              />
            )
          ) : (
            <LeadTable leads={result.leads} onSelect={setSelectedLeadId} />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-faint">
            Page {result.page} of {result.pageCount}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => runQuery({ ...filters, page: filters.page - 1 })}
              disabled={queryPending || result.page <= 1}
              className={secondaryButtonClasses}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => runQuery({ ...filters, page: filters.page + 1 })}
              disabled={queryPending || result.page >= result.pageCount}
              className={secondaryButtonClasses}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      <LeadDrawer
        leadId={selectedLeadId}
        onClose={closeDrawer}
        onLeadMutated={() => runQuery(filters)}
      />
    </>
  );
}
