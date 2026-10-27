import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildBulkStatusActivityBody } from "../../features/leads/bulk.ts";
import {
  buildCurrentAnalytics,
  buildLeadsOverTime,
  buildOutreachActivity,
  getAnalyticsRange,
  getLastCompleteWeeks,
  parseAnalyticsPeriod,
  type AnalyticsActivityEvent,
  type AnalyticsLeadRow,
} from "../../features/analytics/analytics.ts";

function lead(
  status: AnalyticsLeadRow["status"],
  nextFollowUpDate: string | null = null,
  category: string | null = "dental_clinic",
): AnalyticsLeadRow {
  return { status, nextFollowUpDate, category };
}

function activity(
  leadId: string,
  kind: AnalyticsActivityEvent["kind"],
  body: string | null,
  createdAt: string,
): AnalyticsActivityEvent {
  return { leadId, kind, body, createdAt };
}

describe("analytics date ranges", () => {
  test("defaults to 30 days and accepts only the supported periods", () => {
    assert.equal(parseAnalyticsPeriod(undefined), 30);
    assert.equal(parseAnalyticsPeriod("30"), 30);
    assert.equal(parseAnalyticsPeriod("7"), 7);
    assert.equal(parseAnalyticsPeriod("90"), 90);
    assert.equal(parseAnalyticsPeriod("365"), 30);
    assert.equal(parseAnalyticsPeriod(["7", "90"]), 7);
  });

  test("uses inclusive UTC calendar dates and a half-open query end", () => {
    const range = getAnalyticsRange(7, new Date("2026-10-27T23:59:59.000Z"));
    assert.deepEqual(range, {
      period: 7,
      startDate: "2026-10-21",
      endDate: "2026-10-27",
      endExclusive: "2026-10-28",
    });
  });

  test("returns exactly the last 8 complete Monday-based UTC weeks", () => {
    const range = getLastCompleteWeeks("2026-10-27");
    assert.equal(range.startDate, "2026-08-31");
    assert.equal(range.endExclusive, "2026-10-26");
    assert.equal(range.weeks.length, 8);
    assert.equal(range.weeks[0]?.bucket, "2026-08-31");
    assert.equal(range.weeks[7]?.bucket, "2026-10-19");
  });
});

describe("current analytics metrics", () => {
  test("counts current statuses, due dates, and one category per lead", () => {
    const current = buildCurrentAnalytics(
      [
        lead("new", "2026-10-27", "dental_clinic"),
        lead("contacted", "2026-10-28", "dental_clinic"),
        lead("interested", null, "personal_care_services"),
        lead("follow_up", "2026-10-20", null),
      ],
      "2026-10-27",
    );

    assert.deepEqual(current.metrics, {
      savedLeads: 4,
      contactedLeads: 1,
      interestedLeads: 1,
      followUpsDue: 2,
    });
    assert.deepEqual(
      current.statuses.map(({ status, count }) => [status, count]),
      [
        ["new", 1],
        ["to_contact", 0],
        ["contacted", 1],
        ["interested", 1],
        ["not_interested", 0],
        ["follow_up", 1],
      ],
    );
    assert.deepEqual(current.niches, [
      { category: "dental_clinic", label: "Dental clinic", count: 2 },
      { category: "__no_category__", label: "No category", count: 1 },
      {
        category: "personal_care_services",
        label: "Personal care services",
        count: 1,
      },
    ]);
  });

  test("returns every status at zero percent and handles empty datasets", () => {
    const current = buildCurrentAnalytics([], "2026-10-27");
    assert.deepEqual(current.metrics, {
      savedLeads: 0,
      contactedLeads: 0,
      interestedLeads: 0,
      followUpsDue: 0,
    });
    assert.equal(current.statuses.length, 6);
    assert.ok(current.statuses.every((status) => status.count === 0 && status.percentage === 0));
    assert.deepEqual(current.niches, []);
  });

  test("limits niches to the ten largest groups", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      lead("new", null, `niche_${String(index).padStart(2, "0")}`),
    );
    const current = buildCurrentAnalytics(rows, "2026-10-27");
    assert.equal(current.niches.length, 10);
    assert.equal(current.niches[0]?.count, 1);
  });
});

describe("Leads Over Time", () => {
  test("uses actual saved timestamps and contacted status-change event timestamps", () => {
    const range = getAnalyticsRange(7, new Date("2026-10-27T10:00:00.000Z"));
    const data = buildLeadsOverTime(
      [
        { createdAt: "2026-10-21T00:00:00.000Z" },
        { createdAt: "2026-10-21T23:59:59.000Z" },
        { createdAt: "2026-10-27T23:59:59.000Z" },
        { createdAt: "2026-10-28T00:00:00.000Z" },
      ],
      [
        activity("a", "status_change", buildBulkStatusActivityBody("contacted"), "2026-10-21T12:00:00.000Z"),
        activity("a", "status_change", buildBulkStatusActivityBody("contacted"), "2026-10-21T13:00:00.000Z"),
        activity("b", "status_change", buildBulkStatusActivityBody("interested"), "2026-10-22T13:00:00.000Z"),
        activity("c", "status_change", "Status changed to Contacted.", "2026-10-28T00:00:00.000Z"),
      ],
      range,
    );

    assert.equal(data.length, 7);
    assert.deepEqual(data[0], {
      bucket: "2026-10-21",
      label: "21 Oct",
      saved: 2,
      contacted: 1,
    });
    assert.equal(data[1]?.contacted, 0);
    assert.equal(data[6]?.saved, 1);
    assert.equal(data[6]?.contacted, 0);
  });

  test("aggregates 90 days into Monday-based weeks and fills zero intervals", () => {
    const range = getAnalyticsRange(90, new Date("2026-10-27T10:00:00.000Z"));
    const data = buildLeadsOverTime(
      [
        { createdAt: "2026-10-26T00:00:00.000Z" },
        { createdAt: "2026-10-27T12:00:00.000Z" },
      ],
      [],
      range,
    );

    assert.ok(data.length >= 13);
    assert.ok(data.every((point) => point.bucket >= "2026-07-27"));
    assert.equal(data.at(-1)?.bucket, "2026-10-26");
    assert.equal(data.at(-1)?.saved, 2);
    assert.ok(data.slice(0, -1).every((point) => point.saved === 0));
  });
});

describe("Outreach Activity", () => {
  test("counts activity events per complete week, not unique leads", () => {
    const range = getLastCompleteWeeks("2026-10-27");
    const events = [
      activity("same", "status_change", buildBulkStatusActivityBody("contacted"), "2026-10-19T08:00:00.000Z"),
      activity("same", "status_change", buildBulkStatusActivityBody("contacted"), "2026-10-19T09:00:00.000Z"),
      activity("same", "status_change", buildBulkStatusActivityBody("interested"), "2026-10-20T09:00:00.000Z"),
      activity("same", "follow_up_completed", "Follow-up marked complete.", "2026-10-25T23:59:59.000Z"),
      activity("outside", "follow_up_completed", "Follow-up marked complete.", "2026-10-26T00:00:00.000Z"),
    ];
    const data = buildOutreachActivity(events, range);
    const activeWeek = data.find((point) => point.bucket === "2026-10-19");

    assert.equal(data.length, 8);
    assert.deepEqual(activeWeek, {
      bucket: "2026-10-19",
      label: "Week of 19 Oct",
      contacted: 2,
      interested: 1,
      followUpsCompleted: 1,
      total: 4,
    });
    assert.ok(data.filter((point) => point.bucket !== "2026-10-19").every((point) => point.total === 0));
  });

  test("returns zero-valued weeks for an empty activity dataset", () => {
    const data = buildOutreachActivity([], getLastCompleteWeeks("2026-10-27"));
    assert.equal(data.length, 8);
    assert.ok(data.every((point) => point.total === 0));
  });
});
