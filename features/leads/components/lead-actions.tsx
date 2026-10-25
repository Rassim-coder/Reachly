"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  addLeadNote,
  updateLeadStatus,
  type LeadMutationResult,
} from "@/features/leads/actions";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/features/leads/lead-list";
import { MAX_NOTE_LENGTH } from "@/features/leads/validation";

const fieldClasses =
  "w-full rounded-xl border border-line bg-field px-3 py-2 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const buttonClasses =
  "inline-flex h-[34px] w-fit items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

function Feedback({ result }: { result: LeadMutationResult | null }) {
  if (!result) return null;

  return (
    <p
      role="status"
      className={`text-[12px] ${result.ok ? "text-muted" : "text-red-400"}`}
    >
      {result.message}
    </p>
  );
}

export function LeadActions({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(status);
  const [statusPending, startStatusTransition] = useTransition();
  const [statusResult, setStatusResult] = useState<LeadMutationResult | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [notePending, startNoteTransition] = useTransition();
  const [noteResult, setNoteResult] = useState<LeadMutationResult | null>(null);

  function handleStatusUpdate() {
    setStatusResult(null);

    startStatusTransition(async () => {
      const result = await updateLeadStatus(leadId, selectedStatus);
      setStatusResult(result);
    });
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNoteResult(null);

    startNoteTransition(async () => {
      const result = await addLeadNote(leadId, note);
      setNoteResult(result);
      if (result.ok) setNote("");
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="lead-status"
          className="block text-[12px] font-medium text-muted"
        >
          Lead status
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="lead-status"
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value as LeadStatus)
            }
            className="h-[34px] rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none"
          >
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleStatusUpdate}
            disabled={statusPending || selectedStatus === status}
            className={buttonClasses}
          >
            {statusPending ? "Saving…" : "Save status"}
          </button>
        </div>
        <Feedback result={statusResult} />
      </div>

      <form onSubmit={handleNoteSubmit} className="space-y-2">
        <label
          htmlFor="lead-note"
          className="block text-[12px] font-medium text-muted"
        >
          Add a note
        </label>
        <textarea
          id="lead-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          placeholder="Record a call outcome, next step, or useful detail…"
          className={fieldClasses}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-faint">
            {note.length}/{MAX_NOTE_LENGTH}
          </span>
          <button
            type="submit"
            disabled={notePending || note.trim() === ""}
            className={buttonClasses}
          >
            {notePending ? "Adding…" : "Add note"}
          </button>
        </div>
        <Feedback result={noteResult} />
      </form>
    </div>
  );
}
