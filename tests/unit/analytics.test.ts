import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildAnalyticsSnapshot,
  buildLeadsByNiche,
  buildPipelineBreakdown,
  buildSavedOverTime,
  parseAnalyticsRange,
  type AnalyticsLeadRow,
} from "../../features/analytics/analytics.ts";

function lead(
  createdAt: string,
  status: AnalyticsLeadRow["status"],
  category: string | null = "dental_clinic",
): AnalyticsLeadRow {
  return {
    createdAt,
    status,
    nextFollowUpDate: null,
    category,
  };
}

describe("analytics range parsing", () => {
  test("uses an explicit, ordered date range", () => {
    const today = "2026-10-27";
    const range = parseAnalyticsRange({ from: "2026-10-01", to: "2026-10-31" }, today);

    assert.deepEqual(range, {
      from: "2026-10-01",
      to: "2026-10-31",
      toExclusive: "2026-11-01",
    });
  });

  test("defaults to the last 30 days when no dates are supplied", () => {
    const today = "2026-10-27";
    const range = parseAnalyticsRange({}, today);

    assert.deepEqual(range, {
      from: "2026-09-28",
      to: "2026-10-27",
      toExclusive: "2026-10-28",
    });
  });

  test("rejects a reversed date range", () => {
    const range = parseAnalyticsRange(
      { from: "2026-10-31", to: "2026-10-01" },
      "2026-10-27",
    );

    assert.equal(range, null);
  });

  test("falls back to defaults for invalid or missing date values", () => {
    const today = "2026-10-27";
    const badRange = parseAnalyticsRange({ from: "not-a-date", to: "" }, today);

    assert.deepEqual(badRange, {
      from: "2026-09-28",
      to: "2026-10-27",
      toExclusive: "2026-10-28",
    });
  });
});

describe("analytics grouping", () => {
  test("buckets saved leads by day inside a 31-day range", () => {
    const range = {
      from: "2026-10-01",
      to: "2026-10-31",
      toExclusive: "2026-11-01",
    };
    const result = buildSavedOverTime(
      [
        lead("2026-10-01T00:00:00Z", "new"),
        lead("2026-10-01T23:59:59Z", "contacted"),
        lead("2026-10-31T23:59:59Z", "new"),
        lead("2026-11-01T00:00:00Z", "new"),
      ],
      range,
    );

    assert.deepEqual(result, [
      { bucket: "2026-10-01", label: "01 Oct 2026", saved: 2 },
      { bucket: "2026-10-31", label: "31 Oct 2026", saved: 1 },
    ]);
  });

  test("switches to monthly buckets for a range longer than 31 days", () => {
    const range = {
      from: "2026-01-01",
      to: "2026-12-31",
      toExclusive: "2027-01-01",
    };
    const result = buildSavedOverTime(
      [
        lead("2026-02-10T00:00:00Z", "new"),
        lead("2026-02-11T12:00:00Z", "new"),
        lead("2026-03-15T00:00:00Z", "new"),
      ],
      range,
    );

    assert.deepEqual(result, [
      { bucket: "2026-02", label: "Feb 2026", saved: 2 },
      { bucket: "2026-03", label: "Mar 2026", saved: 1 },
    ]);
  });

  test("groups saved leads by status and keeps enum order", () => {
    const breakdown = buildPipelineBreakdown([
      lead("2026-10-01T00:00:00Z", "contacted"),
      lead("2026-10-02T00:00:00Z", "contacted"),
      lead("2026-10-03T00:00:00Z", "new"),
      lead("2026-10-04T00:00:00Z", "interested"),
    ]);

    assert.deepEqual(breakdown, [
      { status: "new", label: "New", count: 1 },
      { status: "to_contact", label: "To contact", count: 0 },
      { status: "contacted", label: "Contacted", count: 2 },
      { status: "interested", label: "Interested", count: 1 },
      { status: "not_interested", label: "Not interested", count: 0 },
      { status: "follow_up", label: "Follow-up", count: 0 },
    ]);
  });

  test("groups leads by niche and labels missing categories", () => {
    const breakdown = buildLeadsByNiche([
      lead("2026-10-01T00:00:00Z", "new", "dental_clinic"),
      lead("2026-10-02T00:00:00Z", "new", "dental_clinic"),
      lead("2026-10-03T00:00:00Z", "new", "personal_care_services"),
      lead("2026-10-04T00:00:00Z", "new", null),
    ]);

    assert.deepEqual(breakdown, [
      { category: "dental_clinic", label: "Dental clinic", count: 2 },
      { category: "__no_category__", label: "No category", count: 1 },
      { category: "personal_care_services", label: "Personal care services", count: 1 },
    ]);
  });

  test("returns an empty, zeroed snapshot for an empty dataset", () => {
    const range = { from: "2026-10-01", to: "2026-10-31", toExclusive: "2026-11-01" };
    const snapshot = buildAnalyticsSnapshot([], 0, 0, 0, range);

    assert.deepEqual(snapshot.savedLeads, 0);
    assert.deepEqual(snapshot.contactedLeads, 0);
    assert.deepEqual(snapshot.interestedLeads, 0);
    assert.deepEqual(snapshot.followUpsDue, 0);
    assert.equal(snapshot.overTime.length, 0);
    assert.equal(snapshot.niches.length, 0);
    assert.deepEqual(snapshot.pipeline, [
      { status: "new", label: "New", count: 0 },
      { status: "to_contact", label: "To contact", count: 0 },
      { status: "contacted", label: "Contacted", count: 0 },
      { status: "interested", label: "Interested", count: 0 },
      { status: "not_interested", label: "Not interested", count: 0 },
      { status: "follow_up", label: "Follow-up", count: 0 },
    ]);
  });
});
