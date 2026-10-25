import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DEFAULT_LEAD_FILTERS,
  hasActiveLeadFilters,
  LEAD_PAGE_SIZE,
  MAX_LEAD_FILTER_LENGTH,
  parseLeadFilters,
  toCategoryIlikePattern,
  toIlikePattern,
} from "../../features/leads/lead-filters.ts";

describe("lead filter parsing", () => {
  test("returns defaults for missing or malformed input", () => {
    assert.deepEqual(parseLeadFilters(undefined), DEFAULT_LEAD_FILTERS);
    assert.deepEqual(parseLeadFilters(null), DEFAULT_LEAD_FILTERS);
    assert.deepEqual(parseLeadFilters("not-an-object"), DEFAULT_LEAD_FILTERS);
    assert.deepEqual(parseLeadFilters({}), DEFAULT_LEAD_FILTERS);
  });

  test("accepts supported values and trims filter text", () => {
    assert.deepEqual(
      parseLeadFilters({
        search: "  dental clinic  ",
        category: " dental_clinic ",
        status: "contacted",
        followUp: "overdue",
        sort: "follow_up_asc",
        page: 3,
      }),
      {
        search: "dental clinic",
        category: "dental_clinic",
        status: "contacted",
        followUp: "overdue",
        sort: "follow_up_asc",
        page: 3,
      },
    );
  });

  test("rejects unsupported enum values and unusable pages", () => {
    const parsed = parseLeadFilters({
      status: "archived",
      followUp: "soon",
      sort: "alphabetical",
      page: -2,
    });

    assert.equal(parsed.status, "all");
    assert.equal(parsed.followUp, "all");
    assert.equal(parsed.sort, "newest");
    assert.equal(parsed.page, 1);

    assert.equal(parseLeadFilters({ page: 1.5 }).page, 1);
    assert.equal(parseLeadFilters({ page: Number.NaN }).page, 1);
    assert.equal(parseLeadFilters({ page: Number.POSITIVE_INFINITY }).page, 1);
    assert.equal(parseLeadFilters({ page: 100_001 }).page, 10_000);
  });

  test("caps filter text before it reaches a query", () => {
    const parsed = parseLeadFilters({ search: "x".repeat(500) });

    assert.equal(parsed.search.length, MAX_LEAD_FILTER_LENGTH);
    assert.equal(parseLeadFilters({ category: 42 }).category, "");
  });
});

describe("lead filter state", () => {
  test("detects narrowing filters but ignores sorting and paging", () => {
    assert.equal(hasActiveLeadFilters(DEFAULT_LEAD_FILTERS), false);
    assert.equal(
      hasActiveLeadFilters({ ...DEFAULT_LEAD_FILTERS, sort: "oldest" }),
      false,
    );
    assert.equal(
      hasActiveLeadFilters({ ...DEFAULT_LEAD_FILTERS, page: 4 }),
      false,
    );
    assert.equal(
      hasActiveLeadFilters({ ...DEFAULT_LEAD_FILTERS, status: "new" }),
      true,
    );
    assert.equal(
      hasActiveLeadFilters({ ...DEFAULT_LEAD_FILTERS, followUp: "overdue" }),
      true,
    );
  });

  test("keeps the page size stable for the server query", () => {
    assert.equal(LEAD_PAGE_SIZE, 20);
  });
});

describe("PostgREST pattern safety", () => {
  test("wraps text in a contains pattern", () => {
    assert.equal(toIlikePattern("dentist"), "%dentist%");
    assert.equal(toIlikePattern("  dentist  "), "%dentist%");
  });

  test("escapes wildcard and escape characters", () => {
    assert.equal(toIlikePattern("50%_off"), "%50\\%\\_off%");
    assert.equal(toIlikePattern("a\\b"), "%a\\\\b%");
  });

  test("accepts humanized category labels and matches token underscores", () => {
    assert.equal(
      toCategoryIlikePattern("Dental clinic"),
      "%Dental\\_clinic%",
    );
    assert.equal(
      toCategoryIlikePattern("dental-clinic"),
      "%dental\\_clinic%",
    );
    assert.equal(toCategoryIlikePattern("dental_clinic"), "%dental\\_clinic%");
    assert.equal(toCategoryIlikePattern(" dental "), "%dental%");
  });
});
