/**
 * Pure presentation and parsing for lead-saving results.
 *
 * The database function is a privileged boundary and its JSON result is still
 * untrusted input from the perspective of the application. This module keeps
 * that parsing and the user-facing summaries testable without a database.
 */

export type SaveLeadResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type BulkSaveLeadsResult =
  | { ok: true; added: number; existing: number; failed: number; total: number }
  | { ok: false; message: string };

export type SaveLeadsOutcome = {
  added: number;
  existing: number;
  failed: number;
  total: number;
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Safely parses the JSON returned by `save_businesses_as_leads`.
 *
 * Returns `null` for malformed, unsuccessful, or internally inconsistent
 * responses so callers can surface a generic failure instead of trusting bad
 * counts. The function must report `ok: true` and counts that add up to `total`.
 */
export function parseSaveLeadsRpcResult(
  value: unknown,
): SaveLeadsOutcome | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.ok !== true) return null;

  const { added, existing, failed, total } = candidate;

  if (
    !isCount(added) ||
    !isCount(existing) ||
    !isCount(failed) ||
    !isCount(total) ||
    total !== added + existing + failed
  ) {
    return null;
  }

  return { added, existing, failed, total };
}

export function singleSaveMessage(outcome: SaveLeadsOutcome): SaveLeadResult {
  if (outcome.added === 1) {
    return { ok: true, message: "Saved to your leads." };
  }

  if (outcome.existing === 1) {
    return { ok: true, message: "This business is already in your leads." };
  }

  return { ok: false, message: "Could not save this lead. Please try again." };
}

export function toBulkSaveResult(
  outcome: SaveLeadsOutcome,
): BulkSaveLeadsResult {
  return {
    ok: true,
    added: outcome.added,
    existing: outcome.existing,
    failed: outcome.failed,
    total: outcome.total,
  };
}
