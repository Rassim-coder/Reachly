import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isValidLeadId,
  mapLeadActivityItem,
  mapLeadActivityRow,
  mapLeadDetailRow,
  type LeadActivityRow,
  type LeadDetailRow,
} from "../../features/leads/lead-detail.ts";
import {
  displayWebsite,
  formatLeadCategory,
  formatLeadDate,
  formatLeadLocation,
  formatLeadTimestamp,
  getLeadFollowUpState,
  isHttpUrl,
  isLeadStatus,
  LEAD_STATUS_LABELS,
  leadFollowUpLabel,
  leadStatusLabel,
  mapLeadRow,
  todayDateString,
  type LeadListRow,
  type LeadListRowBusiness,
  type LeadStatus,
} from "../../features/leads/lead-list.ts";

function business(
  overrides: Partial<LeadListRowBusiness> = {},
): LeadListRowBusiness {
  return {
    name: "Clinique Dentaire",
    category: "dental_clinic",
    phone: "+213 555 01 02",
    email: "contact@example.dz",
    website: "https://example.dz",
    address: "12 Rue Didouche Mourad",
    city: "Algiers",
    ...overrides,
  };
}

function row(overrides: Partial<LeadListRow> = {}): LeadListRow {
  return {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    created_at: "2026-10-24T12:34:56.000Z",
    status: "new",
    last_contacted_at: null,
    next_follow_up_date: null,
    businesses: business(),
    ...overrides,
  };
}

describe("lead status presentation", () => {
  test("labels every value of the real status enum", () => {
    assert.deepEqual(LEAD_STATUS_LABELS, {
      new: "New",
      to_contact: "To contact",
      contacted: "Contacted",
      interested: "Interested",
      not_interested: "Not interested",
      follow_up: "Follow-up",
    });

    for (const [status, label] of Object.entries(LEAD_STATUS_LABELS)) {
      assert.equal(leadStatusLabel(status as LeadStatus), label);
    }
  });

  test("guards untrusted status values", () => {
    for (const status of Object.keys(LEAD_STATUS_LABELS)) {
      assert.equal(isLeadStatus(status), true);
    }

    for (const status of ["", "archived", "NEW", null, 42]) {
      assert.equal(isLeadStatus(status), false);
    }
  });
});

describe("lead date formatting", () => {
  test("formats timestamps and date-only values in UTC", () => {
    assert.equal(formatLeadDate("2026-10-24T23:30:00.000Z"), "24 Oct 2026");
    assert.equal(formatLeadDate("2026-10-24"), "24 Oct 2026");
  });

  test("formats activity timestamps with a time", () => {
    assert.equal(
      formatLeadTimestamp("2026-10-24T23:30:00.000Z"),
      "24 Oct 2026, 23:30",
    );
    assert.equal(formatLeadTimestamp(null), null);
    assert.equal(formatLeadTimestamp("not-a-date"), null);
  });

  test("returns null for empty or invalid values", () => {
    assert.equal(formatLeadDate(null), null);
    assert.equal(formatLeadDate(undefined), null);
    assert.equal(formatLeadDate(""), null);
    assert.equal(formatLeadDate("   "), null);
    assert.equal(formatLeadDate("not-a-date"), null);
  });
});

describe("lead category formatting", () => {
  test("humanizes category tokens without inventing a value", () => {
    assert.equal(formatLeadCategory("dental_clinic"), "Dental clinic");
    assert.equal(formatLeadCategory("  marketing-agency "), "Marketing agency");
    assert.equal(formatLeadCategory(null), null);
    assert.equal(formatLeadCategory("   "), null);
  });
});

describe("lead follow-up state", () => {
  test("uses date-only comparisons for overdue, today, and upcoming", () => {
    const today = "2026-10-25";

    assert.equal(getLeadFollowUpState("2026-10-24", today), "overdue");
    assert.equal(getLeadFollowUpState("2026-10-25", today), "today");
    assert.equal(getLeadFollowUpState("2026-10-26", today), "upcoming");
    assert.equal(getLeadFollowUpState(null, today), "none");
    assert.equal(getLeadFollowUpState("not-a-date", today), "none");
  });

  test("produces deterministic UTC date keys and readable labels", () => {
    assert.equal(
      todayDateString(new Date("2026-10-25T23:59:59.000Z")),
      "2026-10-25",
    );
    assert.equal(leadFollowUpLabel("overdue"), "Overdue");
    assert.equal(leadFollowUpLabel("today"), "Due today");
    assert.equal(leadFollowUpLabel("upcoming"), "Upcoming");
    assert.equal(leadFollowUpLabel("none"), "Not scheduled");
  });
});

describe("lead location formatting", () => {
  test("combines and trims available address parts", () => {
    assert.equal(
      formatLeadLocation("  12 Rue Didouche Mourad  ", "  Algiers "),
      "12 Rue Didouche Mourad, Algiers",
    );
    assert.equal(formatLeadLocation("12 Rue Didouche Mourad", null), "12 Rue Didouche Mourad");
  });

  test("returns null when neither part is available", () => {
    assert.equal(formatLeadLocation(null, null), null);
    assert.equal(formatLeadLocation("", "   "), null);
  });
});

describe("website presentation", () => {
  test("accepts only HTTP(S) URLs for linking", () => {
    assert.equal(isHttpUrl("https://example.dz"), true);
    assert.equal(isHttpUrl("http://example.dz/path"), true);
    assert.equal(isHttpUrl("javascript:alert(1)"), false);
    assert.equal(isHttpUrl("example.dz"), false);
    assert.equal(isHttpUrl(""), false);
  });

  test("removes the protocol and trailing slashes for display", () => {
    assert.equal(displayWebsite("https://example.dz/"), "example.dz");
    assert.equal(displayWebsite("http://example.dz/path/"), "example.dz/path");
  });
});

describe("lead row mapping", () => {
  test("maps joined lead and business data with trimmed fields", () => {
    assert.deepEqual(
      mapLeadRow(
        row({
          status: "follow_up",
          last_contacted_at: "2026-10-20T09:15:00.000Z",
          next_follow_up_date: "2026-10-30",
          businesses: business({
            name: "  Clinique Dentaire  ",
            phone: "  +213 555 01 02 ",
            email: " contact@example.dz ",
            website: " https://example.dz/ ",
            address: " 12 Rue Didouche Mourad ",
            city: " Algiers ",
          }),
        }),
      ),
      {
        id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        createdAt: "2026-10-24T12:34:56.000Z",
        businessName: "Clinique Dentaire",
        category: "Dental clinic",
        phone: "+213 555 01 02",
        email: "contact@example.dz",
        website: "https://example.dz/",
        location: "12 Rue Didouche Mourad, Algiers",
        status: "follow_up",
        lastContactedAt: "2026-10-20T09:15:00.000Z",
        nextFollowUpDate: "2026-10-30",
      },
    );
  });

  test("accepts the defensive array form of the embedded business", () => {
    const mapped = mapLeadRow(row({ businesses: [business({ city: null })] }));

    assert.equal(mapped?.location, "12 Rue Didouche Mourad");
    assert.equal(mapped?.businessName, "Clinique Dentaire");
  });

  test("omits unavailable contact fields", () => {
    const mapped = mapLeadRow(
      row({
        businesses: business({
          phone: null,
          email: "  ",
          website: null,
          address: null,
          city: null,
        }),
      }),
    );

    assert.equal(mapped?.phone, null);
    assert.equal(mapped?.email, null);
    assert.equal(mapped?.website, null);
    assert.equal(mapped?.location, null);
  });

  test("drops rows whose business is missing or unnamed", () => {
    assert.equal(mapLeadRow(row({ businesses: null })), null);
    assert.equal(mapLeadRow(row({ businesses: [] })), null);
    assert.equal(mapLeadRow(row({ businesses: business({ name: "   " }) })), null);
  });
});

describe("lead detail mapping", () => {
  const detailRow: LeadDetailRow = {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    created_at: "2026-10-24T12:34:56.000Z",
    status: "contacted",
    last_contacted_at: "2026-10-24T15:00:00.000Z",
    next_follow_up_date: "2026-10-30",
    businesses: {
      ...business(),
      category: " dental_clinic ",
    },
  };

  function activity(overrides: Partial<LeadActivityRow> = {}): LeadActivityRow {
    return {
      id: "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      kind: "note",
      body: "  Asked for a quote. ",
      created_at: "2026-10-24T16:00:00.000Z",
      ...overrides,
    };
  }

  test("maps business details, category, and note activities", () => {
    assert.deepEqual(mapLeadDetailRow(detailRow, [activity()]), {
      id: detailRow.id,
      createdAt: detailRow.created_at,
      businessName: "Clinique Dentaire",
      category: "Dental clinic",
      phone: "+213 555 01 02",
      email: "contact@example.dz",
      website: "https://example.dz",
      location: "12 Rue Didouche Mourad, Algiers",
      status: "contacted",
      lastContactedAt: "2026-10-24T15:00:00.000Z",
      nextFollowUpDate: "2026-10-30",
      notes: [
        {
          id: "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          body: "Asked for a quote.",
          createdAt: "2026-10-24T16:00:00.000Z",
        },
      ],
      activities: [
        {
          id: "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          kind: "note",
          label: "Note",
          body: "Asked for a quote.",
          createdAt: "2026-10-24T16:00:00.000Z",
        },
      ],
    });
  });

  test("keeps only non-empty note activities", () => {
    const mapped = mapLeadDetailRow(detailRow, [
      activity(),
      activity({ id: "c1", kind: "status_change", body: "contacted" }),
      activity({ id: "c2", kind: "note", body: "   " }),
      activity({ id: "c3", kind: "note", body: null }),
    ]);

    assert.equal(mapped?.notes.length, 1);
    assert.equal(mapped?.notes[0]?.body, "Asked for a quote.");
    assert.equal(mapLeadActivityRow(activity({ kind: "saved" })), null);
  });

  test("maps supported activity kinds into the drawer timeline", () => {
    assert.deepEqual(
      mapLeadActivityItem(
        activity({
          id: "c1",
          kind: "follow_up_scheduled",
          body: "Follow-up scheduled for 30 Oct 2026.",
          created_at: "2026-10-25T08:00:00.000Z",
        }),
      ),
      {
        id: "c1",
        kind: "follow_up_scheduled",
        label: "Follow-up scheduled",
        body: "Follow-up scheduled for 30 Oct 2026.",
        createdAt: "2026-10-25T08:00:00.000Z",
      },
    );

    assert.equal(
      mapLeadActivityItem(activity({ kind: "unknown_kind", body: "ignored" })),
      null,
    );
  });

  test("returns null when the lead's business cannot be mapped", () => {
    assert.equal(
      mapLeadDetailRow({ ...detailRow, businesses: null }, []),
      null,
    );
  });

  test("validates lead ids before querying", () => {
    assert.equal(isValidLeadId(detailRow.id), true);
    assert.equal(isValidLeadId(detailRow.id.toUpperCase()), true);

    for (const value of ["", "not-a-uuid", "123", null, 42]) {
      assert.equal(isValidLeadId(value), false);
    }
  });
});
