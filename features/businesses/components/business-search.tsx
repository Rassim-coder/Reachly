"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

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

import {
  getSearchFailureMessage,
  getSearchNetworkFailureMessage,
} from "../search-errors";
import {
  DEFAULT_SEARCH_FILTERS,
  clearSearchSession,
  readSearchSession,
  writeSearchSession,
  type RestoredSearchSession,
  type SearchQuery,
  type SearchSessionStorage,
} from "../search-session";
import { SaveLeadButton } from "./save-lead-button";

type SearchState =
  | { status: "idle" }
  | {
      status: "success";
      query: SearchQuery;
      results: NormalizedBusiness[];
      nextCursor: string | null;
      firstElapsedMs: number;
      loadingMore: boolean;
      moreError: string | null;
      restored: boolean;
    };

function getSessionStorage(): SearchSessionStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

/**
 * `sessionStorage` is client-only, so the server and first hydration render
 * must not depend on it. This flag forces one client render after hydration,
 * where the lazy state initializers below can read the saved session safely.
 */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
}

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
 * Live Overture business search. Calls `POST /api/businesses/search` and keeps
 * a bounded, temporary snapshot of the last successful search in
 * `sessionStorage` so reloads do not need to re-query Overture. Search results
 * never become leads unless the user explicitly saves them.
 */
export function BusinessSearch() {
  const hydrated = useHydrated();
  const [initialSession] = useState<RestoredSearchSession | null>(() => {
    if (typeof window === "undefined") return null;

    const storage = getSessionStorage();
    return storage ? readSearchSession(storage) : null;
  });
  const [niche, setNiche] = useState(
    () => initialSession?.query.niche ?? "",
  );
  const [location, setLocation] = useState(
    () => initialSession?.query.location ?? "",
  );
  const [state, setState] = useState<SearchState>(() => {
    if (initialSession && initialSession.results !== null) {
      return {
        status: "success",
        query: initialSession.query,
        results: initialSession.results,
        nextCursor: initialSession.nextCursor,
        firstElapsedMs: initialSession.firstElapsedMs ?? 0,
        loadingMore: false,
        moreError: null,
        restored: true,
      };
    }

    return { status: "idle" };
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSession?.selectedIds ?? []),
  );
  const [websiteFilter, setWebsiteFilter] = useState<PresenceFilter>(
    () => initialSession?.filters.website ?? DEFAULT_SEARCH_FILTERS.website,
  );
  const [phoneFilter, setPhoneFilter] = useState<PresenceFilter>(
    () => initialSession?.filters.phone ?? DEFAULT_SEARCH_FILTERS.phone,
  );
  const [emailFilter, setEmailFilter] = useState<PresenceFilter>(
    () => initialSession?.filters.email ?? DEFAULT_SEARCH_FILTERS.email,
  );
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkSaveLeadsResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(
    initialSession && initialSession.results === null
      ? "Your previous results were too large to keep for reload. The last search criteria are filled in, but the results were not restored."
      : null,
  );
  const moreInFlight = useRef(false);
  const bulkInFlight = useRef(false);
  const searchInFlight = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const loadingMore = state.status === "success" && state.loadingMore;
  const resultActionsDisabled = searching || bulkPending;
  const loadedResults = state.status === "success" ? state.results : [];
  const filters: ResultFilters = {
    website: websiteFilter,
    phone: phoneFilter,
    email: emailFilter,
  };
  const filtersActive = hasActiveFilters(filters);

  const visibleResults = filterLoadedBusinesses(loadedResults, filters);
  const showClearResults =
    state.status === "success" || restoreNotice !== null;

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

  useEffect(() => {
    if (!hydrated || state.status !== "success") return;

    const storage = getSessionStorage();
    if (!storage) return;

    writeSearchSession(storage, {
      query: state.query,
      results: state.results,
      nextCursor: state.nextCursor,
      firstElapsedMs: state.firstElapsedMs,
      filters: {
        website: websiteFilter,
        phone: phoneFilter,
        email: emailFilter,
      },
      selectedIds: [...selectedIds],
    });
  }, [
    hydrated,
    state,
    websiteFilter,
    phoneFilter,
    emailFilter,
    selectedIds,
  ]);

  function clearFilters() {
    setWebsiteFilter(DEFAULT_SEARCH_FILTERS.website);
    setPhoneFilter(DEFAULT_SEARCH_FILTERS.phone);
    setEmailFilter(DEFAULT_SEARCH_FILTERS.email);
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

    if (searchInFlight.current || loadingMore || bulkPending) return;

    if (niche.trim() === "" || location.trim() === "") {
      setSearchError("Enter both a niche and a location.");
      return;
    }

    const query: SearchQuery = {
      niche: niche.trim(),
      location: location.trim(),
    };

    // Keep the previous successful results visible until this request succeeds.
    searchInFlight.current = true;
    setSearching(true);
    setSearchError(null);
    setRestoreNotice(null);
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
        const apiError = payload && "error" in payload ? payload : null;
        setSearchError(
          getSearchFailureMessage(apiError, "initial", response.status),
        );
        return;
      }

      if (!payload || !("results" in payload)) {
        setSearchError(
          "We couldn't display search results. Please try the search again.",
        );
        return;
      }

      // Only a successful response replaces the previous result set. Selection
      // and bulk feedback refer to the old rows, so they are reset together.
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
        restored: false,
      });
    } catch {
      setSearchError(getSearchNetworkFailureMessage("initial"));
    } finally {
      searchInFlight.current = false;
      setSearching(false);
    }
  }

  function handleClearResults() {
    if (searching || loadingMore || bulkPending) return;

    // Clearing temporary search state never touches saved leads or Supabase.
    const storage = getSessionStorage();
    if (storage) clearSearchSession(storage);

    setState({ status: "idle" });
    setSelectedIds(new Set());
    setBulkResult(null);
    setSearchError(null);
    setRestoreNotice(null);
    clearFilters();
  }

  async function handleLoadMore() {
    if (
      state.status !== "success" ||
      !state.nextCursor ||
      moreInFlight.current ||
      searching ||
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
        const apiError = payload && "error" in payload ? payload : null;
        const message = getSearchFailureMessage(
          apiError,
          "load_more",
          response.status,
        );
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
                moreError:
                  "More businesses couldn't be displayed. Your current results are unchanged—try Load more again shortly.",
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
              moreError: getSearchNetworkFailureMessage("load_more"),
            }
          : previous,
      );
    } finally {
      moreInFlight.current = false;
    }
  }

  async function handleBulkSave() {
    if (bulkInFlight.current || searching || selectedIds.size === 0) return;

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

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Card>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="h-[62px] animate-pulse rounded-xl bg-field" />
            <div className="h-[62px] animate-pulse rounded-xl bg-field" />
            <div className="h-[38px] w-full animate-pulse rounded-xl bg-field md:w-[110px]" />
          </div>
        </Card>

        <Card>
          <div aria-live="polite">
            <p className="text-[13px] font-medium">Restoring your last search…</p>
            <p className="mt-1 text-[12px] text-muted">
              Checking this tab for temporary results. No new search is
              started.
            </p>
          </div>
        </Card>
      </div>
    );
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
              disabled={searching || loadingMore || bulkPending}
              className="flex h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-4 text-[13px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)] disabled:opacity-60"
            >
              <SearchIcon size={15} />
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-faint">
              Use “City, Country”. Searches use live business data, so the
              first request can take up to about a minute. Results load 50 at a time.
            </p>

            {showClearResults ? (
              <button
                type="button"
                onClick={handleClearResults}
                disabled={searching || loadingMore || bulkPending}
                className="h-[30px] rounded-lg border border-line px-3 text-[11px] font-medium text-muted transition-colors hover:bg-field hover:text-foreground disabled:opacity-60"
              >
                Clear results
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      {restoreNotice ? (
        <Card>
          <EmptyState
            title="Previous search criteria restored"
            description={restoreNotice}
          />
        </Card>
      ) : null}

      {searchError ? (
        <Card>
          <EmptyState
            title={state.status === "success" ? "New search failed" : "Search failed"}
            description={`${searchError}${
              state.status === "success"
                ? " The previous results are still shown below."
                : ""
            }`}
          />
        </Card>
      ) : null}

      {searching ? (
        <Card>
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className="text-[13px] font-medium">Searching for businesses…</p>
            <p className="text-[12px] text-muted">
              We’re checking the latest business data. This can take up to a
              minute on the first request.
              {state.status === "success"
                ? " The previous results stay visible until this search succeeds."
                : ""}
            </p>
            <div className="mt-2 space-y-2" aria-hidden="true">
              <div className="h-3 w-2/3 animate-pulse rounded bg-field" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-field" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-field" />
            </div>
          </div>
        </Card>
      ) : null}

      {state.status === "idle" &&
      !searching &&
      !searchError &&
      !restoreNotice ? (
        <Card>
          <EmptyState
            title="Search real businesses"
            description="Enter a niche and a location to search live business data. Nothing is saved until you save a lead or add selected businesses to My Leads."
          />
        </Card>
      ) : null}

      {state.status === "success" && state.restored ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-line bg-field px-3 py-2 text-[12px] text-muted"
        >
          <span className="font-medium text-foreground">
            Restored from this tab.
          </span>{" "}
          The saved search was not re-run, so existing rows were not fetched again.
          Filters, loaded pages, and valid selections were restored; any additional
          pages load live.
        </div>
      ) : null}

      {state.status === "success" && state.results.length === 0 ? (
        <Card>
          <EmptyState
            title="No matching businesses"
            description="No businesses matched this niche in that area. Try a broader niche or another city."
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
                disabled={resultActionsDisabled}
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
                disabled={resultActionsDisabled || selectedIds.size === 0}
                className="flex h-[32px] items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-3 text-[12px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)] disabled:opacity-60"
              >
                <BookmarkIcon size={14} />
                {bulkPending ? "Adding…" : "Add to My Leads"}
              </button>

              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={resultActionsDisabled}
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
                      disabled={resultActionsDisabled}
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
                  disabled={state.loadingMore || resultActionsDisabled}
                  className="flex h-[36px] items-center justify-center gap-1.5 rounded-xl border border-line bg-field px-4 text-[13px] font-medium text-foreground hover:border-[#6d3ff0] disabled:opacity-60"
                >
                  {state.loadingMore
                    ? "Loading more…"
                    : state.moreError
                      ? "Retry load more"
                      : "Load more"}
                </button>
                <p className="text-[11px] text-faint">
                  {state.loadingMore
                    ? "Loading the next batch of businesses…"
                    : state.moreError
                      ? "Your current results are safe. You can retry this batch."
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
