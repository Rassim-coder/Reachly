import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DEFAULT_RESULT_FILTERS,
  filterLoadedBusinesses,
  hasActiveFilters,
  matchesPresence,
  type PresenceFilter,
  type ResultFilters,
} from "../../features/businesses/result-filters.ts";
import type { NormalizedBusiness } from "../../types/api.ts";

function business(
  sourceId: string,
  overrides: Partial<NormalizedBusiness> = {},
): NormalizedBusiness {
  return {
    sourceId,
    name: sourceId.toUpperCase(),
    category: null,
    address: null,
    latitude: null,
    longitude: null,
    phone: null,
    website: null,
    email: null,
    ...overrides,
  };
}

const businesses = [
  business("a", {
    phone: "123",
    website: "https://a.example",
    email: "a@example.com",
  }),
  business("b"),
  business("c", { website: "https://c.example", email: "c@example.com" }),
  // Normalization should make these null, but filters must be defensive.
  business("d", { phone: "  ", website: "  " }),
  business("e", { phone: "555" }),
];

function visible(
  website: PresenceFilter,
  phone: PresenceFilter,
  email: PresenceFilter,
): string {
  return filterLoadedBusinesses(businesses, { website, phone, email })
    .map((row) => row.sourceId)
    .join(",");
}

function filters(overrides: Partial<ResultFilters> = {}): ResultFilters {
  return { ...DEFAULT_RESULT_FILTERS, ...overrides };
}

describe("business result filters", () => {
  test("all filters keep every loaded business", () => {
    assert.equal(visible("all", "all", "all"), "a,b,c,d,e");
  });

  test("website has/no", () => {
    assert.equal(visible("has", "all", "all"), "a,c");
    assert.equal(visible("none", "all", "all"), "b,d,e");
  });

  test("phone has/no", () => {
    assert.equal(visible("all", "has", "all"), "a,e");
    assert.equal(visible("all", "none", "all"), "b,c,d");
  });

  test("email has/no", () => {
    assert.equal(visible("all", "all", "has"), "a,c");
    assert.equal(visible("all", "all", "none"), "b,d,e");
  });

  test("multiple filters use AND logic", () => {
    assert.equal(visible("has", "none", "has"), "c");
    assert.equal(visible("none", "none", "all"), "b,d");
  });

  test("an impossible combination returns an empty list", () => {
    assert.equal(visible("has", "has", "none"), "");
    assert.deepEqual(filterLoadedBusinesses([], DEFAULT_RESULT_FILTERS), []);
  });

  test("matchesPresence treats null, empty, and whitespace as absent", () => {
    for (const value of [null, "", "   "]) {
      assert.equal(matchesPresence(value, "has"), false);
      assert.equal(matchesPresence(value, "none"), true);
      assert.equal(matchesPresence(value, "all"), true);
    }

    assert.equal(matchesPresence(" value ", "has"), true);
    assert.equal(matchesPresence(" value ", "none"), false);
  });

  test("hasActiveFilters only reports non-default filters", () => {
    assert.equal(hasActiveFilters(DEFAULT_RESULT_FILTERS), false);
    assert.equal(hasActiveFilters(filters({ website: "has" })), true);
    assert.equal(hasActiveFilters(filters({ phone: "none" })), true);
    assert.equal(hasActiveFilters(filters({ email: "has" })), true);
  });

  test("filtering does not mutate the loaded list", () => {
    const before = businesses.map((row) => row.sourceId).join(",");

    filterLoadedBusinesses(businesses, filters({ website: "has", phone: "has" }));

    assert.equal(businesses.map((row) => row.sourceId).join(","), before);
  });
});
