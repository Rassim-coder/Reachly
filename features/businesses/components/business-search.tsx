"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { BookmarkIcon, SearchIcon } from "@/components/ui/icons";
import { Card, CardHeader, EmptyState } from "@/components/ui/page-shell";
import {
  filterLoadedBusinesses,
  hasActiveFilters,
  type PresenceFilter,
  type ResultFilters,
} from "@/features/businesses/result-filters";
import { saveBusinessesAsLeads, type BulkSaveLeadsResult } from "@/features/leads/actions";
import type {
  ApiError,
  BusinessSearchResponse,
  NormalizedBusiness,
} from "@/types/api";

import { SaveLeadButton } from "./save-lead-button";

type SearchQuery = { niche: string; location: string };

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      query: SearchQuery;
      results: NormalizedBusiness[];
      nextCursor: string | null;
      firstElapsedMs: number;
      loadingMore: boolean;
      moreError: string | null;
    }
  | { status: "error"; message: string };

const inputClasses =
  "h-[38px] w-full rounded-xl border border-line bg-field px-3 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const selectClasses =
  "h-[34px] rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none";

function displayWebsite(website: string): string {
  return website.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function PresenceFilterSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: PresenceFilter;
  onChange: (value: PresenceFilter) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as PresenceFilter)}
        className={selectClasses}
      >
        <option value="all">All</option>
        <option value="has">Has {label.toLowerCase()}</option>
        <option value="none">No {label.toLowerCase()}</option>
      </select>
    </label>
  );
}

/**
 * Live Overture business search. Calls `POST /api/businesses/search`; nothing
 * is cached or persisted until the user saves a business as a lead (individually
 * or through the bulk selection toolbar).
 */
export function BusinessSearch() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [websiteFilter, setWebsiteFilter] = useState<PresenceFilter>("all");
  const [phoneFilter, setPhoneFilter] = useState<PresenceFilter>("all");
  const [emailFilter, setEmailFilter] = useState<PresenceFilter>("all");
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkSaveLeadsResult | null>(null);
  const moreInFlight = useRef(false);
  const bulkInFlight = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const loading = state.status === "loading";
  const loadingMore = state.status === "success" && state.loadingMore;
  const loadedResults = state.status === "success" ? state.results : [];
  const filters: ResultFilters = {
    website: websiteFilter,
    phone: phoneFilter,
    email: emailFilter,
  };
  const filtersActive = hasActiveFilters(filters);

  const visibleResults = filterLoadedBusinesses(loadedResults, filters);

  const allLoadedSelected =
    loadedResults.length > 0 &&
    loadedResults.every((business) => selectedIds.has(business.sourceId));
  const someLoadedSelected = loadedResults.some((business) =>
    selectedIds.has(business.sourceId),
  );
  const visibleSelectedCount = visibleResults.filter((business) =>
    selectedIds.has(business.sourceId),
  ).length;
  const hiddenSelectedCount = selectedIds.size - visibleSelectedCount;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someLoadedSelected && !allLoadedSelected;
    }
  }, [someLoadedSelected, allLoadedSelected]);

  function clearFilters() {
    setWebsiteFilter("all");
    setPhoneFilter("all");
    setEmailFilter("all");
  }

  function toggleSelection(sourceId: string) {
    setBulkResult(null);
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }

      return next;
    });
  }

  function handleSelectAll() {
    setBulkResult(null);
    setSelectedIds(() => {
      if (allLoadedSelected) return new Set<string>();

      return new Set(loadedResults.map((business) => business.sourceId));
    });
  }

  function clearSelection() {
    setBulkResult(null);
    setSelectedIds(new Set());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loadingMore || bulkPending) return;

    if (niche.trim() === "" || location.trim() === "") {
      setState({
        status: "error",
        message: "Enter both a niche and a location.",
      });
      return;
    }

    const query: SearchQuery = {
      niche: niche.trim(),
      location: location.trim(),
    };

    setState({ status: "loading" });
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });

      const elapsedMs = Math.round(performance.now() - startedAt);
      const payload = (await response.json().catch(() => null)) as
        | BusinessSearchResponse
        | ApiError
        | null;

      if (!response.ok) {
        const message =
          payload && "error" in payload
            ? payload.error.message
            : `The search failed (HTTP ${response.status}).`;
        setState({ status: "error", message });
        return;
      }

      if (!payload || !("results" in payload)) {
        setState({
          status: "error",
          message: "The search returned an unexpected response.",
        });
        return;
      }

      // A new result set invalidates selections from the previous search.
      setSelectedIds(new Set());
      setBulkResult(null);
      setState({
        status: "success",
        query,
        results: payload.results,
        nextCursor: payload.nextCursor,
        firstElapsedMs: elapsedMs,
        loadingMore: false,
        moreError: null,
      });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the search service. Check your connection and try again.",
      });
    }
  }

  async function handleLoadMore() {
    if (
      state.status !== "success" ||
      !state.nextCursor ||
      moreInFlight.current ||
      bulkPending
    ) {
      return;
    }

    const { query, nextCursor } = state;
    moreInFlight.current = true;
    setState({ ...state, loadingMore: true, moreError: null });

    try {
      const response = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...query, cursor: nextCursor }),
      });

      const payload = (await response.json().catch(() => null)) as
        | BusinessSearchResponse
        | ApiError
        | null;

      if (!response.ok) {
        const message =
          payload && "error" in payload
            ? payload.error.message
            : `Could not load more results (HTTP ${response.status}).`;
        setState((previous) =>
          previous.status === "success"
            ? { ...previous, loadingMore: false, moreError: message }
            : previous,
        );
        return;
      }

      if (!payload || !("results" in payload)) {
        setState((previous) =>
          previous.status === "success"
            ? {
                ...previous,
                loadingMore: false,
                moreError: "The search returned an unexpected response.",
              }
            : previous,
        );
        return;
      }

      setState((previous) => {
        if (
          previous.status !== "success" ||
          previous.query.niche !== query.niche ||
          previous.query.location !== query.location
        ) {
          return previous;
        }

        // The server's keyset pages cannot overlap; dedupe is a client-side
        // safety net so the list never shows the same business twice.
        const seen = new Set(previous.results.map((business) => business.sourceId));

        return {
          ...previous,
          results: [
            ...previous.results,
            ...payload.results.filter((business) => !seen.has(business.sourceId)),
          ],
          nextCursor: payload.nextCursor,
          loadingMore: false,
          moreError: null,
        };
      });
    } catch {
      setState((previous) =>
        previous.status === "success"
          ? {
              ...previous,
              loadingMore: false,
              moreError:
                "Could not load more results. Check your connection and try again.",
            }
          : previous,
      );
    } finally {
      moreInFlight.current = false;
    }
  }

  async function handleBulkSave() {
    if (bulkInFlight.current || selectedIds.size === 0) return;

    const selectedBusinesses = loadedResults.filter((business) =>
      selectedIds.has(business.sourceId),
    );

    if (selectedBusinesses.length === 0) return;

    bulkInFlight.current = true;
    setBulkPending(true);
    setBulkResult(null);

    try {
      const result = await saveBusinessesAsLeads(selectedBusinesses);
      setBulkResult(result);

      // Keep failed items selected so the user can retry exactly those.
      if (result.ok && result.failed === 0) {
        setSelectedIds(new Set());
      }
    } catch {
      setBulkResult({
        ok: false,
        message:
          "Could not save the selected businesses. Check your connection and try again.",
      });
    } finally {
      bulkInFlight.current = false;
      setBulkPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="business-niche" className="text-[12px] font-medium text-muted">
                Niche
              </label>
              <input
                id="business-niche"
                type="text"
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="e.g. dentist"
                maxLength={100}
                required
                className={inputClasses}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="business-location"
                className="text-[12px] font-medium text-muted"
              >
                Location
              </label>
              <input
                id="business-location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Oran, Algeria"
                maxLength={120}
                required
                className={inputClasses}
              />
            </div>

            <button
              type="submit"
              disabled={loading || loadingMore || bulkPending}
              className="flex h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-4 text-[13px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)] disabled:opacity-60"
            >
              <SearchIcon size={15} />
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          <p className="text-[11px] text-faint">
            Use “City, Country”. Searches query the live Overture Maps dataset, so the
            first request can take up to about a minute. Results load 50 at a time.
          </p>
        </form>
      </Card>

      {state.status === "idle" ? (
        <Card>
          <EmptyState
            title="Search real businesses"
            description="Enter a niche and a location to pull businesses from Overture Maps. Nothing is saved until you save a lead or add selected businesses to My Leads."
          />
        </Card>
      ) : null}

      {state.status === "loading" ? (
        <Card>
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className="text-[13px] font-medium">Searching Overture Maps…</p>
            <p className="text-[12px] text-muted">
              DuckDB is reading the remote Parquet dataset. This can take up to a
              minute on the first request.
            </p>
            <div className="mt-2 space-y-2" aria-hidden="true">
              <div className="h-3 w-2/3 animate-pulse rounded bg-field" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-field" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-field" />
            </div>
          </div>
        </Card>
      ) : null}

      {state.status === "error" ? (
        <Card>
          <EmptyState title="Search failed" description={state.message} />
        </Card>
      ) : null}

      {state.status === "success" && state.results.length === 0 ? (
        <Card>
          <EmptyState
            title="No matching businesses"
            description="Overture has no businesses for this niche in that area. Try a broader niche or another city."
          />
        </Card>
      ) : null}

      {state.status === "success" && state.results.length > 0 ? (
        <Card>
          <CardHeader
            title={
              filtersActive
                ? `${visibleResults.length} of ${loadedResults.length} loaded visible`
                : `${loadedResults.length} ${
                    loadedResults.length === 1 ? "business" : "businesses"
                  } loaded`
            }
            description={`First batch returned in ${(state.firstElapsedMs / 1000).toFixed(
              1,
            )}s. Loaded results only; total matches are not estimated.${
              filtersActive ? " Filters apply to loaded businesses." : ""
            }`}
          />

          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-field px-3 py-2.5">
            <PresenceFilterSelect
              id="filter-website"
              label="Website"
              value={websiteFilter}
              onChange={setWebsiteFilter}
            />
            <PresenceFilterSelect
              id="filter-phone"
              label="Phone"
              value={phoneFilter}
              onChange={setPhoneFilter}
            />
            <PresenceFilterSelect
              id="filter-email"
              label="Email"
              value={emailFilter}
              onChange={setEmailFilter}
            />

            <span className="pb-2 text-[11px] text-faint">
              {visibleResults.length} of {loadedResults.length} loaded visible
            </span>

            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-[34px] rounded-lg border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-line bg-field px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-[12px] font-medium">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allLoadedSelected}
                onChange={handleSelectAll}
                disabled={bulkPending}
                className="h-4 w-4 accent-[#6d3ff0]"
              />
              Select all loaded ({loadedResults.length})
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-muted" aria-live="polite">
                {selectedIds.size} selected
                {hiddenSelectedCount > 0
                  ? ` (${hiddenSelectedCount} hidden by filters)`
                  : ""}
              </span>

              <button
                type="button"
                onClick={handleBulkSave}
                disabled={bulkPending || selectedIds.size === 0}
                className="flex h-[32px] items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-3 text-[12px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)] disabled:opacity-60"
              >
                <BookmarkIcon size={14} />
                {bulkPending ? "Adding…" : "Add to My Leads"}
              </button>

              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={bulkPending}
                  className="h-[32px] rounded-xl border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-60"
                >
                  Clear selection
                </button>
              ) : null}
            </div>
          </div>

          {bulkResult ? (
            <div
              aria-live="polite"
              className={`mb-3 rounded-xl border px-3 py-2 text-[12px] ${
                !bulkResult.ok
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : bulkResult.failed > 0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-line bg-field text-muted"
              }`}
            >
              {bulkResult.ok ? (
                <>
                  <p className="font-medium text-foreground">Bulk save finished</p>
                  <p>
                    Added: {bulkResult.added} · Already existed:{" "}
                    {bulkResult.existing} · Failed: {bulkResult.failed}
                  </p>
                  {bulkResult.failed > 0 ? (
                    <p className="mt-0.5">
                      Selection was kept so you can retry. Saving again will not
                      duplicate leads.
                    </p>
                  ) : null}
                </>
              ) : (
                <p role="alert">{bulkResult.message}</p>
              )}
            </div>
          ) : null}

          {visibleResults.length === 0 ? (
            <EmptyState
              title="No loaded businesses match these filters"
              description={`None of the ${loadedResults.length} loaded businesses match the current filter combination. Selections are preserved when filters change.`}
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 h-[32px] rounded-lg border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {visibleResults.map((business) => (
                <li
                  key={business.sourceId}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(business.sourceId)}
                      onChange={() => toggleSelection(business.sourceId)}
                      disabled={bulkPending}
                      aria-label={`Select ${business.name}`}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#6d3ff0]"
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold">{business.name}</p>
                        {business.category ? (
                          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                            {business.category.replaceAll("_", " ")}
                          </span>
                        ) : null}
                      </div>

                      <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                        {business.address ? <dd>{business.address}</dd> : null}

                        {business.phone ? (
                          <dd>
                            <a href={`tel:${business.phone}`} className="hover:underline">
                              {business.phone}
                            </a>
                          </dd>
                        ) : null}

                        {business.email ? (
                          <dd>
                            <a href={`mailto:${business.email}`} className="hover:underline">
                              {business.email}
                            </a>
                          </dd>
                        ) : null}

                        {business.website ? (
                          <dd className="truncate">
                            {isHttpUrl(business.website) ? (
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                              >
                                {displayWebsite(business.website)}
                              </a>
                            ) : (
                              displayWebsite(business.website)
                            )}
                          </dd>
                        ) : null}
                      </dl>
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    <SaveLeadButton business={business} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div
            aria-live="polite"
            className="mt-4 flex flex-col items-center gap-2 border-t border-line pt-4"
          >
            {state.moreError ? (
              <p role="alert" className="text-center text-[12px] text-[#f87171]">
                {state.moreError}
              </p>
            ) : null}

            {state.nextCursor ? (
              <>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={state.loadingMore || bulkPending}
                  className="flex h-[36px] items-center justify-center gap-1.5 rounded-xl border border-line bg-field px-4 text-[13px] font-medium text-foreground hover:border-[#6d3ff0] disabled:opacity-60"
                >
                  {state.loadingMore ? "Loading more…" : "Load more"}
                </button>
                <p className="text-[11px] text-faint">
                  {state.loadingMore
                    ? "Querying the next batch from Overture Maps…"
                    : "More results are available."}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-faint">No more results available.</p>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
