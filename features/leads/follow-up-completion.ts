export type FollowUpCompletionState =
  | "completed"
  | "already_cleared"
  | "rescheduled"
  | "not_found"
  | "failed";

export type FollowUpCompletionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Orchestrates the existing date-clear + completion-activity workflow.
 * Database operations stay in the authenticated server action; isolating this
 * sequence makes partial failures and idempotent retries testable offline.
 */
export async function runFollowUpCompletion({
  clear,
  recordCompletion,
  revalidate,
}: {
  clear: () => Promise<FollowUpCompletionState>;
  recordCompletion: () => Promise<boolean>;
  revalidate: () => void;
}): Promise<FollowUpCompletionResult> {
  let state: FollowUpCompletionState;

  try {
    state = await clear();
  } catch {
    return {
      ok: false,
      message: "Could not complete this follow-up. Please try again.",
    };
  }

  if (state === "failed") {
    return {
      ok: false,
      message: "Could not complete this follow-up. Please try again.",
    };
  }

  if (state === "not_found") {
    return { ok: false, message: "Lead not found." };
  }

  if (state === "rescheduled") {
    revalidate();
    return {
      ok: false,
      message: "This follow-up changed before it could be completed. Refresh and try again.",
    };
  }

  revalidate();

  if (state === "already_cleared") {
    return { ok: true, message: "No pending follow-up remains." };
  }

  let recorded = false;
  try {
    recorded = await recordCompletion();
  } catch {
    // The date clear already committed. Keep the UI truthful and visible while
    // reporting that history analytics may not include this completion event.
  }

  return {
    ok: true,
    message: recorded
      ? "Follow-up completed."
      : "Follow-up completed. The activity history could not be recorded.",
  };
}
