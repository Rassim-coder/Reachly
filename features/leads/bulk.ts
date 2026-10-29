import { isValidLeadId } from "./lead-detail.ts";
import {
  formatLeadDate,
  isLeadStatus,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "./lead-list.ts";

/**
 * Pure validation, planning, and result-shaping for bulk lead operations.
 * Database access and authorization stay in `actions.ts`.
 */

export const MAX_BULK_LEADS = 100;

export type BulkLeadResult = {
  /** False only when the request could not be completed at all. */
  ok: boolean;
  tone: "success" | "warning" | "error";
  message: string;
  requestedCount: number;
  affectedIds: string[];
  unchangedIds: string[];
  failedIds: string[];
};

export type BulkLeadIdsResult =
  | { ok: true; ids: string[] }
  | { ok: false; message: string };

export type BulkStatusResult =
  | { ok: true; value: LeadStatus }
  | { ok: false; message: string };

export type BulkLeadStatusRow = {
  id: string;
  status: LeadStatus;
};

export type BulkLeadFollowUpRow = {
  id: string;
  next_follow_up_date: string | null;
};

export type BulkLeadPlan = {
  changedIds: string[];
  unchangedIds: string[];
  /** Requested ids that were absent from the user's owned rows. */
  failedIds: string[];
};

export type LeadActivityInsertKind =
  | "status_change"
  | "follow_up_scheduled"
  | "follow_up_completed"
  | "follow_up_cleared";

export type LeadActivityInsert = {
  lead_id: string;
  user_id: string;
  kind: LeadActivityInsertKind;
  body: string;
};

/** Marks ids that are absent from the owned rows as failed without exposing why. */
function rowKey(id: string): string {
  return id.toLowerCase();
}

function leadCount(count: number): string {
  return `${count} ${count === 1 ? "lead" : "leads"}`;
}

export function bulkErrorResult(
  message: string,
  requestedCount = 0,
): BulkLeadResult {
  return {
    ok: false,
    tone: "error",
    message,
    requestedCount,
    affectedIds: [],
    unchangedIds: [],
    failedIds: [],
  };
}

/** Validates, trims, and deduplicates a stable-id selection. */
export function validateBulkLeadIds(input: unknown): BulkLeadIdsResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, message: "Select at least one lead." };
  }

  if (input.length > MAX_BULK_LEADS) {
    return {
      ok: false,
      message: `Select no more than ${MAX_BULK_LEADS} leads at a time.`,
    };
  }

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const value of input) {
    if (!isValidLeadId(value)) {
      return { ok: false, message: "One or more selected leads are invalid." };
    }

    const normalized = value.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      ids.push(normalized);
    }
  }

  return { ok: true, ids };
}

export function validateBulkStatus(input: unknown): BulkStatusResult {
  if (!isLeadStatus(input)) {
    return { ok: false, message: "Choose a valid lead status." };
  }

  return { ok: true, value: input };
}

export function planBulkStatusChange(
  rows: readonly BulkLeadStatusRow[],
  requestedIds: readonly string[],
  status: LeadStatus,
): BulkLeadPlan {
  const rowsById = new Map(rows.map((row) => [rowKey(row.id), row]));
  const changedIds: string[] = [];
  const unchangedIds: string[] = [];
  const failedIds: string[] = [];

  for (const id of requestedIds) {
    const row = rowsById.get(rowKey(id));

    if (!row) {
      failedIds.push(id);
    } else if (row.status === status) {
      unchangedIds.push(id);
    } else {
      changedIds.push(id);
    }
  }

  return { changedIds, unchangedIds, failedIds };
}

export function planBulkFollowUpChange(
  rows: readonly BulkLeadFollowUpRow[],
  requestedIds: readonly string[],
  nextFollowUpDate: string | null,
): BulkLeadPlan {
  const rowsById = new Map(rows.map((row) => [rowKey(row.id), row]));
  const changedIds: string[] = [];
  const unchangedIds: string[] = [];
  const failedIds: string[] = [];

  for (const id of requestedIds) {
    const row = rowsById.get(rowKey(id));

    if (!row) {
      failedIds.push(id);
    } else if (row.next_follow_up_date === nextFollowUpDate) {
      unchangedIds.push(id);
    } else {
      changedIds.push(id);
    }
  }

  return { changedIds, unchangedIds, failedIds };
}

export function buildBulkStatusActivityBody(status: LeadStatus): string {
  return `Status changed to ${LEAD_STATUS_LABELS[status]}.`;
}

export type FollowUpCompletionState =
  | "already_cleared"
  | "rescheduled"
  | "still_scheduled";

/** Classifies a guarded completion update that matched no row. */
export function classifyFollowUpCompletionMiss(
  currentDate: string | null,
  expectedDate: string,
): FollowUpCompletionState {
  if (currentDate === null) return "already_cleared";
  if (currentDate !== expectedDate) return "rescheduled";
  return "still_scheduled";
}

export function buildBulkFollowUpActivity(nextFollowUpDate: string | null): {
  kind: "follow_up_scheduled" | "follow_up_cleared";
  body: string;
} {
  if (nextFollowUpDate === null) {
    return { kind: "follow_up_cleared", body: "Follow-up cleared." };
  }

  return {
    kind: "follow_up_scheduled",
    body: `Follow-up scheduled for ${
      formatLeadDate(nextFollowUpDate) ?? nextFollowUpDate
    }.`,
  };
}

/** Builds one insert payload so a bulk operation records its history in one request. */
export function buildBulkActivityRows(
  userId: string,
  leadIds: readonly string[],
  kind: LeadActivityInsertKind,
  body: string,
): LeadActivityInsert[] {
  return leadIds.map((leadId) => ({
    lead_id: leadId,
    user_id: userId,
    kind,
    body,
  }));
}

export function summarizeBulkStatusChange({
  requestedIds,
  changedIds,
  unchangedIds,
  failedIds,
  activityRecorded,
}: {
  requestedIds: readonly string[];
  changedIds: readonly string[];
  unchangedIds: readonly string[];
  failedIds: readonly string[];
  activityRecorded: boolean;
}): BulkLeadResult {
  const parts: string[] = [];

  if (changedIds.length > 0) {
    parts.push(`Status updated for ${leadCount(changedIds.length)}.`);
  } else if (unchangedIds.length > 0) {
    parts.push("No status changes were needed.");
  } else {
    parts.push("No status changes were made.");
  }

  if (unchangedIds.length > 0) {
    parts.push(`${leadCount(unchangedIds.length)} already had that status.`);
  }

  if (failedIds.length > 0) {
    parts.push(`${leadCount(failedIds.length)} could not be updated.`);
  }

  if (!activityRecorded) {
    parts.push("The activity history could not be recorded.");
  }

  const tone =
    changedIds.length === 0 && unchangedIds.length === 0
      ? "error"
      : failedIds.length > 0 || !activityRecorded
        ? "warning"
        : "success";

  return {
    ok: tone !== "error",
    tone,
    message: parts.join(" "),
    requestedCount: requestedIds.length,
    affectedIds: [...changedIds],
    unchangedIds: [...unchangedIds],
    failedIds: [...failedIds],
  };
}

export function summarizeBulkFollowUpChange({
  requestedIds,
  changedIds,
  unchangedIds,
  failedIds,
  activityRecorded,
  nextFollowUpDate,
}: {
  requestedIds: readonly string[];
  changedIds: readonly string[];
  unchangedIds: readonly string[];
  failedIds: readonly string[];
  activityRecorded: boolean;
  nextFollowUpDate: string | null;
}): BulkLeadResult {
  const scheduling = nextFollowUpDate !== null;
  const parts: string[] = [];

  if (changedIds.length > 0) {
    parts.push(
      scheduling
        ? `Follow-up date set for ${leadCount(changedIds.length)}.`
        : `Follow-up dates cleared for ${leadCount(changedIds.length)}.`,
    );
  } else if (unchangedIds.length > 0) {
    parts.push(
      scheduling
        ? "No follow-up changes were needed."
        : "No follow-up dates needed clearing.",
    );
  } else {
    parts.push("No follow-up changes were made.");
  }

  if (unchangedIds.length > 0) {
    parts.push(
      scheduling
        ? `${leadCount(unchangedIds.length)} already had that date.`
        : `${leadCount(unchangedIds.length)} had no follow-up date.`,
    );
  }

  if (failedIds.length > 0) {
    parts.push(`${leadCount(failedIds.length)} could not be updated.`);
  }

  if (!activityRecorded) {
    parts.push("The activity history could not be recorded.");
  }

  const tone =
    changedIds.length === 0 && unchangedIds.length === 0
      ? "error"
      : failedIds.length > 0 || !activityRecorded
        ? "warning"
        : "success";

  return {
    ok: tone !== "error",
    tone,
    message: parts.join(" "),
    requestedCount: requestedIds.length,
    affectedIds: [...changedIds],
    unchangedIds: [...unchangedIds],
    failedIds: [...failedIds],
  };
}

export function summarizeBulkDelete({
  requestedIds,
  deletedIds,
  failedIds,
}: {
  requestedIds: readonly string[];
  deletedIds: readonly string[];
  failedIds: readonly string[];
}): BulkLeadResult {
  if (deletedIds.length === 0) {
    return {
      ok: false,
      tone: "error",
      message: "No selected leads could be deleted. Refresh the list and try again.",
      requestedCount: requestedIds.length,
      affectedIds: [],
      unchangedIds: [],
      failedIds: [...failedIds],
    };
  }

  const parts = [`Deleted ${leadCount(deletedIds.length)}.`];

  if (failedIds.length > 0) {
    parts.push(`${leadCount(failedIds.length)} could not be deleted.`);
  }

  return {
    ok: true,
    tone: failedIds.length > 0 ? "warning" : "success",
    message: parts.join(" "),
    requestedCount: requestedIds.length,
    affectedIds: [...deletedIds],
    unchangedIds: [],
    failedIds: [...failedIds],
  };
}

export function bulkDeleteConfirmation(count: number): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  return {
    title: count === 1 ? "Delete this lead?" : `Delete ${count} leads?`,
    description:
      `This permanently deletes ${leadCount(count)}. Their activity history ` +
      "and list memberships will also be removed. Shared business records are kept.",
    confirmLabel: count === 1 ? "Delete lead" : `Delete ${count} leads`,
  };
}
