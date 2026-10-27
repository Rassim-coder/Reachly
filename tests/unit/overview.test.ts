import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildBulkStatusActivityBody } from "../../features/leads/bulk.ts";
import {
  buildOverviewData,
  formatRelativeTime,
  getOverviewMonthRange,
  type OverviewContactEvent,
  type OverviewLeadRecord,
  type OverviewNote,
} from "../../features/overview/overview.ts";

function lead(
  id: string,
  createdAt: string,
  status: OverviewLeadRecord["status"] = "new",
  overrides: Partial<OverviewLeadRecord> = {},
): OverviewLeadRecord {
  return {
    id,
    createdAt,
    status,
    nextFollowUpDate: null,
    businessName: `Business ${id}`,
    category: "dental_clinic",
    location: "Algiers",
    ...overrides,
  };
}

function contactedEvent(leadId: string, createdAt: string): OverviewContactEvent {
  return {
    leadId,
    kind: "status_change",
    body: buildBulkStatusActivityBody("contacted"),
    createdAt,
  };
}

describe("Overview month range", () => {
  test("uses the current and previous five UTC calendar months", () => {
    assert.deepEqual(getOverviewMonthRange(new Date("2026-10-27T12:00:00.000Z")), {
      startDate: "2026-05-01",
      endExclusive: "2026-11-01",
      months: [
        { bucket: "2026-05", label: "May 26" },
        { bucket: "2026-06", label: "Jun 26" },
        { bucket: "2026-07", label: "Jul 26" },
        { bucket: "2026-08", label: "Aug 26" },
        { bucket: "2026-09", label: "Sept 26" },
        { bucket: "2026-10", label: "Oct 26" },
      ],
    });
  });
});

describe("Overview aggregation", () => {
  test("keeps lifetime/current metrics distinct from period-based chart events", () => {
    const rows = [
      lead("old", "2026-04-11T10:00:00.000Z", "new", {
        nextFollowUpDate: "2026-10-26",
      }),
      lead("recent", "2026-10-02T10:00:00.000Z", "contacted", {
        nextFollowUpDate: "2026-10-27",
      }),
      lead("future", "2026-10-03T10:00:00.000Z", "interested", {
        nextFollowUpDate: "2026-10-28",
      }),
      lead("no-category", "2026-09-03T10:00:00.000Z", "follow_up", {
        category: null,
      }),
    ];
    const contacts = [
      contactedEvent("recent", "2026-10-25T12:00:00.000Z"),
      contactedEvent("recent", "2026-10-26T12:00:00.000Z"),
      contactedEvent("outside-chart", "2026-04-30T12:00:00.000Z"),
      {
        leadId: "other",
        kind: "status_change" as const,
        body: buildBulkStatusActivityBody("interested"),
        createdAt: "2026-10-27T11:00:00.000Z",
      },
    ];

    const data = buildOverviewData(
      rows,
      contacts,
      [],
      new Date("2026-10-27T12:00:00.000Z"),
    );

    assert.deepEqual(data.stats, {
      savedLeads: 4,
      contactedLast7Days: 1,
      replies: null,
      followUpsDue: 2,
    });
    assert.equal(data.monthlyTrends.length, 6);
    assert.equal(data.monthlyTrends[0]?.saved, 0);
    assert.equal(data.monthlyTrends.find((point) => point.bucket === "2026-09")?.saved, 1);
    assert.equal(data.monthlyTrends.find((point) => point.bucket === "2026-10")?.contacted, 1);
    assert.equal(data.pipeline.reduce((sum, item) => sum + item.count, 0), 4);
    assert.equal(data.niches.find((item) => item.category === "__no_category__")?.count, 1);
    assert.equal(data.contactedHistoryError, null);
  });

  test("marks Contacted metrics unavailable rather than fabricating zero on query failure", () => {
    const data = buildOverviewData(
      [lead("lead", "2026-10-01T00:00:00.000Z")],
      null,
      [],
      new Date("2026-10-27T12:00:00.000Z"),
    );

    assert.equal(data.stats.contactedLast7Days, null);
    assert.match(data.contactedHistoryError ?? "", /could not be loaded/);
  });

  test("orders recent leads and due follow-ups, including actual latest notes", () => {
    const rows = [
      lead("later", "2026-10-25T00:00:00.000Z", "new", {
        nextFollowUpDate: "2026-10-28",
      }),
      lead("earlier", "2026-10-20T00:00:00.000Z", "follow_up", {
        nextFollowUpDate: "2026-10-26",
      }),
      ...Array.from({ length: 6 }, (_, index) =>
        lead(`old-${index}`, `2026-10-${String(10 - index).padStart(2, "0")}T00:00:00.000Z`),
      ),
    ];
    const notes: OverviewNote[] = [
      { leadId: "earlier", body: "Older note", createdAt: "2026-10-25T10:00:00.000Z" },
      { leadId: "earlier", body: "Most recent note", createdAt: "2026-10-26T10:00:00.000Z" },
    ];
    const data = buildOverviewData(
      rows,
      [],
      notes,
      new Date("2026-10-27T12:00:00.000Z"),
    );

    assert.equal(data.recentLeads.length, 5);
    assert.equal(data.recentLeads[0]?.id, "later");
    assert.equal(data.followUps.length, 2);
    assert.equal(data.followUps[0]?.id, "earlier");
    assert.equal(data.followUps[0]?.dueLabel, "Overdue");
    assert.equal(data.followUps[0]?.latestNote, "Most recent note");
    assert.equal(data.followUps[1]?.dueLabel, "Tomorrow");
  });

  test("handles empty datasets without mock values", () => {
    const data = buildOverviewData([], [], [], new Date("2026-10-27T12:00:00.000Z"));
    assert.deepEqual(data.stats, {
      savedLeads: 0,
      contactedLast7Days: 0,
      replies: null,
      followUpsDue: 0,
    });
    assert.ok(data.monthlyTrends.every((point) => point.saved === 0 && point.contacted === 0));
    assert.ok(data.pipeline.every((item) => item.count === 0));
    assert.deepEqual(data.niches, []);
    assert.deepEqual(data.recentLeads, []);
    assert.deepEqual(data.followUps, []);
  });

  test("formats relative creation times safely", () => {
    const now = new Date("2026-10-27T12:00:00.000Z");
    assert.equal(formatRelativeTime("invalid", now), "Date unavailable");
    assert.equal(formatRelativeTime("2026-10-27T11:59:30.000Z", now), "Just now");
  });
});
