import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildBulkActivityRows,
  buildBulkFollowUpActivity,
  buildBulkStatusActivityBody,
  bulkDeleteConfirmation,
  classifyFollowUpCompletionMiss,
  MAX_BULK_LEADS,
  planBulkFollowUpChange,
  planBulkStatusChange,
  summarizeBulkDelete,
  summarizeBulkFollowUpChange,
  summarizeBulkStatusChange,
  validateBulkLeadIds,
  validateBulkStatus,
  type BulkLeadFollowUpRow,
  type BulkLeadStatusRow,
} from "../../features/leads/bulk.ts";
import { getSafeLeadPage } from "../../features/leads/lead-filters.ts";
import {
  deselectIds,
  getPageSelectionState,
  pruneSelection,
  setPageSelection,
  toggleSelectedLead,
} from "../../features/leads/lead-selection.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

describe("lead selection", () => {
  test("selects and deselects individual stable ids", () => {
    const selected = toggleSelectedLead(new Set(), A);
    assert.deepEqual([...selected], [A]);

    const deselected = toggleSelectedLead(selected, A);
    assert.deepEqual([...deselected], []);
  });

  test("selects only the supplied page and reports indeterminate state", () => {
    const selected = setPageSelection(new Set(), [A, B], true);
    assert.deepEqual([...selected], [A, B]);
    assert.equal(getPageSelectionState(selected, [A, B]), "all");
    assert.equal(getPageSelectionState(selected, [A, B, C]), "some");
    assert.equal(getPageSelectionState(selected, [C, D]), "none");
  });

  test("deselects the page without touching hidden ids", () => {
    const selected = new Set([A, B, C]);
    const next = setPageSelection(selected, [A, B], false);

    assert.deepEqual([...next], [C]);
  });

  test("prunes ids that are no longer visible and removes deleted ids", () => {
    const selected = new Set([A, B, C]);

    assert.deepEqual([...pruneSelection(selected, [A, C])], [A, C]);
    assert.deepEqual([...deselectIds(selected, [B])], [A, C]);
    assert.equal(getPageSelectionState(selected, []), "none");
  });
});

describe("bulk lead validation", () => {
  test("rejects empty, non-array, and oversized selections", () => {
    assert.deepEqual(validateBulkLeadIds([]), {
      ok: false,
      message: "Select at least one lead.",
    });
    assert.deepEqual(validateBulkLeadIds("not-an-array"), {
      ok: false,
      message: "Select at least one lead.",
    });

    const oversized = Array.from(
      { length: MAX_BULK_LEADS + 1 },
      () => A,
    );
    assert.deepEqual(validateBulkLeadIds(oversized), {
      ok: false,
      message: `Select no more than ${MAX_BULK_LEADS} leads at a time.`,
    });
  });

  test("rejects invalid ids and deduplicates case-insensitively", () => {
    assert.deepEqual(validateBulkLeadIds([A, "not-a-lead"]), {
      ok: false,
      message: "One or more selected leads are invalid.",
    });
    assert.deepEqual(validateBulkLeadIds([A.toUpperCase(), A.toLowerCase()]), {
      ok: true,
      ids: [A],
    });
  });

  test("validates every supported status and rejects other values", () => {
    for (const status of [
      "new",
      "to_contact",
      "contacted",
      "interested",
      "follow_up",
      "not_interested",
    ]) {
      assert.deepEqual(validateBulkStatus(status), { ok: true, value: status });
    }

    for (const status of ["", "archived", null, 42]) {
      assert.deepEqual(validateBulkStatus(status), {
        ok: false,
        message: "Choose a valid lead status.",
      });
    }
  });
});

describe("bulk status planning", () => {
  const rows: BulkLeadStatusRow[] = [
    { id: A, status: "new" },
    { id: B, status: "interested" },
  ];

  test("separates changed, unchanged, and absent owned rows", () => {
    assert.deepEqual(planBulkStatusChange(rows, [A, B, C], "contacted"), {
      changedIds: [A, B],
      unchangedIds: [],
      failedIds: [C],
    });

    assert.deepEqual(planBulkStatusChange(rows, [A, B, C], "new"), {
      changedIds: [B],
      unchangedIds: [A],
      failedIds: [C],
    });
  });

  test("summarizes successful and partial updates accurately", () => {
    const success = summarizeBulkStatusChange({
      requestedIds: [A, B],
      changedIds: [A, B],
      unchangedIds: [],
      failedIds: [],
      activityRecorded: true,
    });
    assert.equal(success.ok, true);
    assert.equal(success.tone, "success");
    assert.equal(success.message, "Status updated for 2 leads.");

    const partial = summarizeBulkStatusChange({
      requestedIds: [A, B, C],
      changedIds: [A, B],
      unchangedIds: [],
      failedIds: [C],
      activityRecorded: true,
    });
    assert.equal(partial.tone, "warning");
    assert.equal(partial.message, "Status updated for 2 leads. 1 lead could not be updated.");

    const activityWarning = summarizeBulkStatusChange({
      requestedIds: [A],
      changedIds: [A],
      unchangedIds: [],
      failedIds: [],
      activityRecorded: false,
    });
    assert.equal(activityWarning.tone, "warning");
    assert.match(activityWarning.message, /activity history could not be recorded/);
  });

  test("reports no-op and fully failed selections without claiming updates", () => {
    const unchanged = summarizeBulkStatusChange({
      requestedIds: [A],
      changedIds: [],
      unchangedIds: [A],
      failedIds: [],
      activityRecorded: true,
    });
    assert.equal(unchanged.tone, "success");
    assert.equal(
      unchanged.message,
      "No status changes were needed. 1 lead already had that status.",
    );

    const failed = summarizeBulkStatusChange({
      requestedIds: [A],
      changedIds: [],
      unchangedIds: [],
      failedIds: [A],
      activityRecorded: true,
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.tone, "error");
    assert.match(failed.message, /could not be updated/);
  });
});

describe("bulk follow-up planning", () => {
  const rows: BulkLeadFollowUpRow[] = [
    { id: A, next_follow_up_date: null },
    { id: B, next_follow_up_date: "2026-10-30" },
    { id: C, next_follow_up_date: null },
  ];

  test("plans scheduling, changing, and clearing dates", () => {
    assert.deepEqual(planBulkFollowUpChange(rows, [A, B, C], "2026-11-05"), {
      changedIds: [A, B, C],
      unchangedIds: [],
      failedIds: [],
    });

    assert.deepEqual(
      planBulkFollowUpChange(rows, [A, B, D], "2026-10-30"),
      {
        changedIds: [A],
        unchangedIds: [B],
        failedIds: [D],
      },
    );

    assert.deepEqual(planBulkFollowUpChange(rows, [A, B], null), {
      changedIds: [B],
      unchangedIds: [A],
      failedIds: [],
    });
  });

  test("summarizes scheduling and clearing without duplicating unchanged rows", () => {
    const scheduled = summarizeBulkFollowUpChange({
      requestedIds: [A, B],
      changedIds: [A],
      unchangedIds: [B],
      failedIds: [],
      activityRecorded: true,
      nextFollowUpDate: "2026-11-05",
    });
    assert.equal(
      scheduled.message,
      "Follow-up date set for 1 lead. 1 lead already had that date.",
    );

    const cleared = summarizeBulkFollowUpChange({
      requestedIds: [A, B],
      changedIds: [A],
      unchangedIds: [B],
      failedIds: [],
      activityRecorded: true,
      nextFollowUpDate: null,
    });
    assert.equal(
      cleared.message,
      "Follow-up dates cleared for 1 lead. 1 lead had no follow-up date.",
    );

    const partial = summarizeBulkFollowUpChange({
      requestedIds: [A, B, C],
      changedIds: [A],
      unchangedIds: [B],
      failedIds: [C],
      activityRecorded: true,
      nextFollowUpDate: null,
    });
    assert.equal(partial.tone, "warning");
    assert.match(partial.message, /1 lead could not be updated/);
  });

  test("builds the same activity wording used by single-lead updates", () => {
    assert.deepEqual(buildBulkFollowUpActivity("2026-10-30"), {
      kind: "follow_up_scheduled",
      body: "Follow-up scheduled for 30 Oct 2026.",
    });
    assert.deepEqual(buildBulkFollowUpActivity(null), {
      kind: "follow_up_cleared",
      body: "Follow-up cleared.",
    });
    assert.equal(
      buildBulkStatusActivityBody("not_interested"),
      "Status changed to Not interested.",
    );

    assert.deepEqual(buildBulkActivityRows("user-1", [A, B], "status_change", "Status changed to New."), [
      {
        lead_id: A,
        user_id: "user-1",
        kind: "status_change",
        body: "Status changed to New.",
      },
      {
        lead_id: B,
        user_id: "user-1",
        kind: "status_change",
        body: "Status changed to New.",
      },
    ]);
  });
});

describe("follow-up completion retry classification", () => {
  test("treats a missing scheduled date as an idempotent completed state", () => {
    assert.equal(
      classifyFollowUpCompletionMiss(null, "2026-10-30"),
      "already_cleared",
    );
  });

  test("detects when the follow-up was rescheduled after the request began", () => {
    assert.equal(
      classifyFollowUpCompletionMiss("2026-11-05", "2026-10-30"),
      "rescheduled",
    );
  });

  test("distinguishes a still-scheduled date from a completed request", () => {
    assert.equal(
      classifyFollowUpCompletionMiss("2026-10-30", "2026-10-30"),
      "still_scheduled",
    );
  });
});

describe("bulk deletion and pagination", () => {
  test("shows the selected count in the confirmation copy", () => {
    assert.deepEqual(bulkDeleteConfirmation(1), {
      title: "Delete this lead?",
      description:
        "This permanently deletes 1 lead. Their activity history and list memberships will also be removed. Shared business records are kept.",
      confirmLabel: "Delete lead",
    });

    const plural = bulkDeleteConfirmation(3);
    assert.equal(plural.title, "Delete 3 leads?");
    assert.equal(plural.confirmLabel, "Delete 3 leads");
    assert.match(plural.description, /3 leads/);
    assert.match(plural.description, /Shared business records are kept/);
  });

  test("reports full, partial, and failed deletions", () => {
    const full = summarizeBulkDelete({
      requestedIds: [A, B],
      deletedIds: [A, B],
      failedIds: [],
    });
    assert.equal(full.message, "Deleted 2 leads.");
    assert.equal(full.tone, "success");

    const partial = summarizeBulkDelete({
      requestedIds: [A, B, C],
      deletedIds: [A],
      failedIds: [B, C],
    });
    assert.equal(partial.ok, true);
    assert.equal(partial.tone, "warning");
    assert.equal(partial.message, "Deleted 1 lead. 2 leads could not be deleted.");

    const failed = summarizeBulkDelete({
      requestedIds: [A],
      deletedIds: [],
      failedIds: [A],
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.tone, "error");
    assert.equal(failed.affectedIds.length, 0);
  });

  test("moves off a page that no longer exists after deleting its final rows", () => {
    assert.equal(getSafeLeadPage(3, 2), 2);
    assert.equal(getSafeLeadPage(2, 1), 1);
    assert.equal(getSafeLeadPage(1, 0), 1);
    assert.equal(getSafeLeadPage(Number.NaN, 2), 1);
    assert.equal(getSafeLeadPage(2, 4), 2);
  });
});
