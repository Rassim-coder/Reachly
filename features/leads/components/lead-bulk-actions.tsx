"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  bulkDeleteLeads,
  bulkUpdateLeadFollowUp,
  bulkUpdateLeadStatus,
} from "../actions";
import {
  bulkDeleteConfirmation,
  type BulkLeadResult,
} from "../bulk";
import { LEAD_STATUS_LABELS, type LeadStatus } from "../lead-list";

const fieldClasses =
  "h-[32px] rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none disabled:opacity-60";

const primaryButtonClasses =
  "inline-flex h-[32px] items-center justify-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const secondaryButtonClasses =
  "inline-flex h-[32px] items-center justify-center rounded-full border border-line bg-surface px-3.5 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

const dangerButtonClasses =
  "inline-flex h-[32px] items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-3.5 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50";

const dangerSolidButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full bg-red-600 px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

type BulkAction = "status" | "follow_up" | "delete";

function networkFailure(requestedCount: number): BulkLeadResult {
  return {
    ok: false,
    tone: "error",
    message: "Could not reach the server. Please try again.",
    requestedCount,
    affectedIds: [],
    unchangedIds: [],
    failedIds: [],
  };
}

/**
 * Toolbar for the checked leads on the current page. Selection state stays in
 * the workspace so the table and pagination use one source of truth.
 */
export function LeadBulkActions({
  selectedIds,
  disabled,
  onClearSelection,
  onMutated,
  onDeleted,
}: {
  selectedIds: string[];
  disabled: boolean;
  onClearSelection: () => void;
  onMutated: (result: BulkLeadResult) => void;
  onDeleted: (result: BulkLeadResult) => void;
}) {
  const [statusDraft, setStatusDraft] = useState<LeadStatus | "">("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inFlightRef = useRef(false);
  const [, startTransition] = useTransition();

  if (selectedIds.length === 0) return null;

  const pending = pendingAction !== null;
  const actionsDisabled = disabled || pending;

  function run(
    action: BulkAction,
    work: () => Promise<BulkLeadResult>,
    onComplete: (result: BulkLeadResult) => void,
  ) {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const requestedCount = selectedIds.length;
    setPendingAction(action);

    startTransition(async () => {
      let result: BulkLeadResult;

      try {
        result = await work();
      } catch {
        result = networkFailure(requestedCount);
      }

      try {
        onComplete(result);
      } finally {
        inFlightRef.current = false;
        setPendingAction(null);
      }
    });
  }

  function handleStatusApply() {
    if (!statusDraft || actionsDisabled) return;

    const ids = [...selectedIds];
    const status = statusDraft;

    run(
      "status",
      () => bulkUpdateLeadStatus(ids, status),
      (result) => {
        if (result.ok) setStatusDraft("");
        onMutated(result);
      },
    );
  }

  function handleFollowUpApply(nextFollowUpDate: string | null) {
    if (actionsDisabled) return;

    const ids = [...selectedIds];

    run(
      "follow_up",
      () => bulkUpdateLeadFollowUp(ids, nextFollowUpDate),
      (result) => {
        if (result.ok) setFollowUpDraft("");
        onMutated(result);
      },
    );
  }

  function handleDeleteConfirm() {
    if (actionsDisabled) return;

    const ids = [...selectedIds];

    run(
      "delete",
      () => bulkDeleteLeads(ids),
      (result) => {
        setDeleteOpen(false);
        onDeleted(result);
      },
    );
  }

  return (
    <>
      <section
        aria-label="Bulk lead actions"
        aria-busy={pending}
        className="mb-3 rounded-2xl border border-line bg-surface p-3 shadow-card"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[12px] font-semibold" aria-live="polite">
              {selectedIds.length} selected
            </p>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={actionsDisabled}
              className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
            >
              Clear selection
            </button>
            <span className="text-[11px] text-faint">
              Current page only
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="bulk-lead-status">
              Bulk status
            </label>
            <select
              id="bulk-lead-status"
              aria-label="Bulk status"
              value={statusDraft}
              onChange={(event) =>
                setStatusDraft(event.target.value as LeadStatus | "")
              }
              disabled={actionsDisabled}
              className={`${fieldClasses} w-[145px]`}
            >
              <option value="">Set status…</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStatusApply}
              disabled={actionsDisabled || statusDraft === ""}
              className={primaryButtonClasses}
            >
              {pendingAction === "status" ? "Applying…" : "Apply status"}
            </button>

            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />

            <label className="sr-only" htmlFor="bulk-lead-follow-up">
              Bulk follow-up date
            </label>
            <input
              id="bulk-lead-follow-up"
              type="date"
              aria-label="Bulk follow-up date"
              value={followUpDraft}
              onChange={(event) => setFollowUpDraft(event.target.value)}
              disabled={actionsDisabled}
              className={`${fieldClasses} w-[142px]`}
            />
            <button
              type="button"
              onClick={() => handleFollowUpApply(followUpDraft || null)}
              disabled={actionsDisabled || followUpDraft === ""}
              className={primaryButtonClasses}
            >
              {pendingAction === "follow_up" ? "Saving…" : "Set date"}
            </button>
            <button
              type="button"
              onClick={() => handleFollowUpApply(null)}
              disabled={actionsDisabled}
              className={secondaryButtonClasses}
            >
              Clear dates
            </button>

            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />

            <button
              type="button"
              onClick={() => {
                if (!inFlightRef.current) setDeleteOpen(true);
              }}
              disabled={actionsDisabled}
              className={dangerButtonClasses}
            >
              Delete
            </button>
          </div>
        </div>
      </section>

      {deleteOpen ? (
        <DeleteLeadsDialog
          count={selectedIds.length}
          pending={pendingAction === "delete"}
          onCancel={() => {
            if (pendingAction !== "delete") setDeleteOpen(false);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}

function DeleteLeadsDialog({
  count,
  pending,
  onCancel,
  onConfirm,
}: {
  count: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const copy = bulkDeleteConfirmation(count);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    // Do not call dialog.close() from an effect cleanup. React Strict Mode
    // replays effects in development, and closing the dialog there fires
    // `close`, which would immediately reject the confirmation. Unmounting the
    // component removes the native dialog from the top layer safely.
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClose={() => {
        if (!pending) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
      className="m-auto w-[min(430px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.35)] backdrop:bg-black/45"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-[16px] font-semibold">
          {copy.title}
        </h2>
        <p id={descriptionId} className="mt-2 text-[12px] leading-relaxed text-muted">
          {copy.description}
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={pending}
            className={secondaryButtonClasses}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={dangerSolidButtonClasses}
          >
            {pending ? "Deleting…" : copy.confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
