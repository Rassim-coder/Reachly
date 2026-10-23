"use client";

import { useRef, useState, type FormEvent } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { Card, CardHeader, EmptyState } from "@/components/ui/page-shell";
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

function displayWebsite(website: string): string {
  return website.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Live Overture business search. Calls `POST /api/businesses/search`; nothing
 * is cached or persisted until the user saves a specific result as a lead.
 */
export function BusinessSearch() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const moreInFlight = useRef(false);

  const loading = state.status === "loading";
  const loadingMore = state.status === "success" && state.loadingMore;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loadingMore) return;

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
    if (state.status !== "success" || !state.nextCursor || moreInFlight.current) {
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
              disabled={loading || loadingMore}
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
            description="Enter a niche and a location to pull businesses from Overture Maps. Nothing is saved until you choose Save lead."
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
            title={`${state.results.length} ${
              state.results.length === 1 ? "business" : "businesses"
            } loaded`}
            description={`First batch returned in ${(state.firstElapsedMs / 1000).toFixed(
              1,
            )}s. Results load 50 at a time; totals are not estimated.`}
          />

          <ul className="divide-y divide-line">
            {state.results.map((business) => (
              <li
                key={business.sourceId}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
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

                <div className="shrink-0 sm:self-center">
                  <SaveLeadButton business={business} />
                </div>
              </li>
            ))}
          </ul>

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
                  disabled={state.loadingMore}
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
