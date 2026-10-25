import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  groupFollowUps,
  type FollowUpItem,
} from "../../features/follow-ups/follow-up-queue.ts";
import { todayDateString } from "../../features/leads/lead-list.ts";

function lead(
  id: string,
  businessName: string,
  nextFollowUpDate: string | null,
  overrides: Partial<FollowUpItem> = {},
): FollowUpItem {
  return {
    id,
    createdAt: "2026-10-01T00:00:00.000Z",
    businessName,
    category: "Dental clinic",
    phone: "+213 555 01 02",
    email: null,
    website: null,
    location: "Algiers",
    status: "follow_up",
    lastContactedAt: null,
    nextFollowUpDate,
    latestNote: null,
    ...overrides,
  };
}

describe("follow-up queue grouping", () => {
  test("splits scheduled leads into overdue, today, and upcoming", () => {
    const result = groupFollowUps(
      [
        lead("overdue-late", "Zeta Dental", "2026-10-24"),
        lead("today", "Today Dental", "2026-10-25"),
        lead("upcoming-far", "Far Dental", "2026-10-30"),
        lead("overdue-old", "Alpha Dental", "2026-10-20"),
        lead("upcoming-near", "Near Dental", "2026-10-26"),
        lead("unscheduled", "No Date Dental", null),
        lead("invalid", "Invalid Date Dental", "not-a-date"),
      ],
      "2026-10-25",
    );

    assert.deepEqual(
      result.overdue.map((item) => item.id),
      ["overdue-old", "overdue-late"],
    );
    assert.deepEqual(
      result.today.map((item) => item.id),
      ["today"],
    );
    assert.deepEqual(
      result.upcoming.map((item) => item.id),
      ["upcoming-near", "upcoming-far"],
    );
    assert.deepEqual(result.counts, {
      overdue: 2,
      today: 1,
      upcoming: 2,
    });
    assert.equal(result.total, 5);
  });

  test("never puts one lead in more than one section", () => {
    const result = groupFollowUps(
      [
        lead("a", "Alpha Dental", "2026-10-24"),
        lead("b", "Beta Dental", "2026-10-25"),
        lead("c", "Gamma Dental", "2026-10-26"),
        lead("d", "Delta Dental", "2026-10-26"),
      ],
      "2026-10-25",
    );
    const ids = [
      ...result.overdue,
      ...result.today,
      ...result.upcoming,
    ].map((item) => item.id);

    assert.equal(ids.length, result.total);
    assert.equal(new Set(ids).size, result.total);
  });

  test("orders same-day leads by business name for a stable queue", () => {
    const result = groupFollowUps(
      [
        lead("z", "Zeta Dental", "2026-10-25"),
        lead("a", "alpha Dental", "2026-10-25"),
        lead("m", "Mid Dental", "2026-10-25"),
      ],
      "2026-10-25",
    );

    assert.deepEqual(
      result.today.map((item) => item.businessName),
      ["alpha Dental", "Mid Dental", "Zeta Dental"],
    );
  });

  test("does not mutate the caller's lead array", () => {
    const input = [
      lead("late", "Zeta Dental", "2026-10-30"),
      lead("early", "Alpha Dental", "2026-10-20"),
    ];
    const originalOrder = input.map((item) => item.id);

    groupFollowUps(input, "2026-10-25");

    assert.deepEqual(
      input.map((item) => item.id),
      originalOrder,
    );
  });

  test("uses UTC calendar boundaries for date-only comparisons", () => {
    assert.equal(
      todayDateString(new Date("2026-10-25T00:00:00.000Z")),
      "2026-10-25",
    );
    assert.equal(
      todayDateString(new Date("2026-10-24T23:59:59.999Z")),
      "2026-10-24",
    );

    const result = groupFollowUps(
      [
        lead("previous-day", "Previous Day Dental", "2026-10-24"),
        lead("today", "Today Dental", "2026-10-25"),
        lead("next-day", "Next Day Dental", "2026-10-26"),
      ],
      "2026-10-25",
    );

    assert.deepEqual(result.counts, {
      overdue: 1,
      today: 1,
      upcoming: 1,
    });
  });
});
