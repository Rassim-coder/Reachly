"use client";

import { useState, type FormEvent } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { Card, CardHeader, EmptyState } from "@/components/ui/page-shell";
import type {
  ApiError,
  BusinessSearchResponse,
  NormalizedBusiness,
} from "@/types/api";

import { SaveLeadButton } from "./save-lead-button";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; results: NormalizedBusiness[]; elapsedMs: number }
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (niche.trim() === "" || location.trim() === "") {
      setState({
        status: "error",
        message: "Enter both a niche and a location.",
      });
      return;
    }

    setState({ status: "loading" });
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim(), location: location.trim() }),
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

      setState({ status: "success", results: payload.results, elapsedMs });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the search service. Check your connection and try again.",
      });
    }
  }

  const loading = state.status === "loading";

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
              disabled={loading}
              className="flex h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-4 text-[13px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)] disabled:opacity-60"
            >
              <SearchIcon size={15} />
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          <p className="text-[11px] text-faint">
            Use “City, Country”. Searches query the live Overture Maps dataset, so the
            first request can take up to about a minute.
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
            } found`}
            description={`Live Overture search completed in ${(state.elapsedMs / 1000).toFixed(
              1,
            )}s.`}
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
        </Card>
      ) : null}
    </div>
  );
}
