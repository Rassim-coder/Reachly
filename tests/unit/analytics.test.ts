import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildBulkStatusActivityBody } from "../../features/leads/bulk.ts";
import {
  buildCurrentAnalytics,
  buildLeadsOverTime,
  buildOutreachActivity,
  getAnalyticsRange,
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

  test("returns matching UTC bounds for 30 and 90 day selections", () => {
    assert.deepEqual(getAnalyticsRange(30, new Date("2026-10-27T10:00:00.000Z")), {
      period: 30,
      startDate: "2026-09-28",
      endDate: "2026-10-27",
      endExclusive: "2026-10-28",
    });
    assert.deepEqual(getAnalyticsRange(90, new Date("2026-10-27T10:00:00.000Z")), {
      period: 90,
      startDate: "2026-07-30",
      endDate: "2026-10-27",
      endExclusive: "2026-10-28",
    });
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

  test("a completed follow-up leaves the lead/status intact and removes it from due counts", () => {
    const before = buildCurrentAnalytics(
      [lead("contacted", "2026-10-27", "dental_clinic")],
      "2026-10-27",
    );
    const after = buildCurrentAnalytics(
      [lead("contacted", null, "dental_clinic")],
      "2026-10-27",
    );

    assert.equal(before.metrics.followUpsDue, 1);
    assert.equal(after.metrics.followUpsDue, 0);
    assert.equal(after.metrics.contactedLeads, 1);
    assert.equal(after.statuses.find((item) => item.status === "contacted")?.count, 1);
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

  test("aggregates the selected 30-day range daily and excludes boundary overflow", () => {
    const range = getAnalyticsRange(30, new Date("2026-10-27T10:00:00.000Z"));
    const data = buildLeadsOverTime(
      [
        { createdAt: "2026-09-27T23:59:59.999Z" },
        { createdAt: "2026-09-28T00:00:00.000Z" },
        { createdAt: "2026-10-27T23:59:59.999Z" },
        { createdAt: "2026-10-28T00:00:00.000Z" },
      ],
      [],
      range,
    );

    assert.equal(data.length, 30);
    assert.equal(data[0]?.bucket, "2026-09-28");
    assert.equal(data[0]?.saved, 1);
    assert.equal(data.at(-1)?.bucket, "2026-10-27");
    assert.equal(data.at(-1)?.saved, 1);
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
  test("uses daily buckets for 7 days, includes today, and counts events", () => {
    const range = getAnalyticsRange(7, new Date("2026-10-27T10:00:00.000Z"));
    const events = [
      activity("same", "status_change", buildBulkStatusActivityBody("contacted"), "2026-10-27T08:00:00.000Z"),
      activity("same", "status_change", buildBulkStatusActivityBody("contacted"), "2026-10-27T09:00:00.000Z"),
      activity("same", "status_change", buildBulkStatusActivityBody("interested"), "2026-10-22T09:00:00.000Z"),
      activity("same", "follow_up_completed", "Follow-up marked complete.", "2026-10-27T23:59:59.000Z"),
      activity("outside", "follow_up_completed", "Follow-up marked complete.", "2026-10-28T00:00:00.000Z"),
      activity("outside", "follow_up_completed", "Follow-up marked complete.", "2026-10-20T23:59:59.000Z"),
    ];
    const data = buildOutreachActivity(events, range);
    const activeDay = data.find((point) => point.bucket === "2026-10-27");

    assert.equal(data.length, 7);
    assert.deepEqual(activeDay, {
      bucket: "2026-10-27",
      label: "27 Oct",
      contacted: 2,
      interested: 0,
      followUpsCompleted: 1,
      total: 3,
    });
    assert.equal(data.find((point) => point.bucket === "2026-10-22")?.interested, 1);
    assert.ok(data.filter((point) => point.bucket !== "2026-10-27" && point.bucket !== "2026-10-22").every((point) => point.total === 0));
  });

  test("uses daily buckets for 30 days and weekly buckets for 90 days", () => {
    const events = [
      activity("lead", "follow_up_completed", "Done", "2026-09-28T09:00:00.000Z"),
      activity("lead", "follow_up_completed", "Done", "2026-10-26T09:00:00.000Z"),
    ];
    const range30 = getAnalyticsRange(30, new Date("2026-10-27T10:00:00.000Z"));
    const daily = buildOutreachActivity(events, range30);
    assert.equal(daily.length, 30);
    assert.equal(daily[0]?.bucket, "2026-09-28");
    assert.equal(daily.at(-1)?.bucket, "2026-10-27");
    assert.equal(daily[0]?.followUpsCompleted, 1);

    const range90 = getAnalyticsRange(90, new Date("2026-10-27T10:00:00.000Z"));
    const weekly = buildOutreachActivity(events, range90);
    assert.equal(weekly[0]?.bucket, "2026-07-27");
    assert.equal(weekly.at(-1)?.bucket, "2026-10-26");
    assert.equal(weekly.at(-1)?.followUpsCompleted, 1);
    assert.equal(weekly.length, 14);
  });

  test("fills empty intervals in every selected range", () => {
    for (const period of [7, 30, 90] as const) {
      const data = buildOutreachActivity(
        [],
        getAnalyticsRange(period, new Date("2026-10-27T10:00:00.000Z")),
      );
      assert.ok(data.length > 0);
      assert.ok(data.every((point) => point.total === 0));
    }
  });
});
