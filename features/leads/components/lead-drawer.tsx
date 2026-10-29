"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { XIcon } from "@/components/ui/icons";

import {
  addLeadNote,
  completeLeadFollowUp,
  updateLeadFollowUp,
  updateLeadStatus,
  type LeadMutationResult,
} from "../actions";
import { loadLeadDetails } from "../list-actions";
import {
  displayWebsite,
  formatLeadDate,
  formatLeadTimestamp,
  getLeadFollowUpState,
  isHttpUrl,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "../lead-list";
import type { LeadDetail } from "../lead-detail";
import { MAX_NOTE_LENGTH } from "../validation";
import { FollowUpLabel, StatusBadge } from "./lead-list";
import { TemplatePicker } from "@/features/templates/components/template-picker";

const fieldClasses =
  "w-full rounded-xl border border-line bg-field px-3 py-2 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none disabled:opacity-60";

const buttonClasses =
  "inline-flex h-[32px] w-fit items-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const secondaryButtonClasses =
  "inline-flex h-[32px] w-fit items-center rounded-full border border-line bg-surface px-3.5 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

function Feedback({ result }: { result: LeadMutationResult | null }) {
  if (!result) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-[12px] ${result.ok ? "text-muted" : "text-red-400"}`}
    >
      {result.message}
    </p>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="mt-0.5 text-[12px] text-muted">{children}</dd>
    </div>
  );
}

export function LeadDrawer({
  leadId,
  refreshToken,
  onClose,
  onLeadMutated,
}: {
  leadId: string | null;
  refreshToken: number;
  onClose: () => void;
  onLeadMutated: () => void;
}) {
  if (!leadId) return null;

  return (
    <LeadDrawerPanel
      key={`${leadId}:${refreshToken}`}
      leadId={leadId}
      onClose={onClose}
      onLeadMutated={onLeadMutated}
    />
  );
}

function LeadDrawerPanel({
  leadId,
  onClose,
  onLeadMutated,
}: {
  leadId: string;
  onClose: () => void;
  onLeadMutated: () => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startLoadTransition] = useTransition();
  const requestId = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [statusDraft, setStatusDraft] = useState<LeadStatus>("new");
  const [statusPending, startStatusTransition] = useTransition();
  const [statusResult, setStatusResult] =
    useState<LeadMutationResult | null>(null);

  const [followUpDraft, setFollowUpDraft] = useState("");
  const [followUpPending, startFollowUpTransition] = useTransition();
  const [followUpResult, setFollowUpResult] =
    useState<LeadMutationResult | null>(null);

  const [note, setNote] = useState("");
  const [notePending, startNoteTransition] = useTransition();
  const [noteResult, setNoteResult] = useState<LeadMutationResult | null>(null);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let cancelled = false;

    startLoadTransition(async () => {
      const result = await loadLeadDetails(leadId);

      if (cancelled || currentRequest !== requestId.current) return;

      if (result.ok) {
        setDetail(result.lead);
        setStatusDraft(result.lead.status);
        setFollowUpDraft(result.lead.nextFollowUpDate ?? "");
      } else {
        setDetail(null);
        setError(result.message);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
      requestId.current += 1;
    };
  }, [leadId, startLoadTransition]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [leadId, onClose]);

  function reloadDetails() {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    startLoadTransition(async () => {
      const result = await loadLeadDetails(leadId);

      if (currentRequest !== requestId.current) return;

      if (result.ok) {
        setDetail(result.lead);
        setStatusDraft(result.lead.status);
        setFollowUpDraft(result.lead.nextFollowUpDate ?? "");
      } else {
        setError(result.message);
      }

      setLoading(false);
    });
  }

  function handleStatusUpdate() {
    if (!detail || statusDraft === detail.status) return;

    setStatusResult(null);

    startStatusTransition(async () => {
      const result = await updateLeadStatus(detail.id, statusDraft);
      setStatusResult(result);

      if (!result.ok) return;

      const refreshed = await loadLeadDetails(detail.id);
      if (refreshed.ok) {
        setDetail(refreshed.lead);
        setStatusDraft(refreshed.lead.status);
        setFollowUpDraft(refreshed.lead.nextFollowUpDate ?? "");
      }
      onLeadMutated();
    });
  }

  function handleFollowUpSave(nextDate: string | null): void {
    if (!detail) return;

    if (
      nextDate === null &&
      detail.nextFollowUpDate === null
    ) {
      return;
    }

    if (nextDate !== null && nextDate === detail.nextFollowUpDate) {
      return;
    }

    setFollowUpResult(null);

    startFollowUpTransition(async () => {
      const result = await updateLeadFollowUp(detail.id, nextDate);
      setFollowUpResult(result);

      if (!result.ok) return;

      const refreshed = await loadLeadDetails(detail.id);
      if (refreshed.ok) {
        setDetail(refreshed.lead);
        setStatusDraft(refreshed.lead.status);
        setFollowUpDraft(refreshed.lead.nextFollowUpDate ?? "");
      }
      onLeadMutated();
    });
  }

  function handleCompleteFollowUp() {
    if (!detail || !detail.nextFollowUpDate) return;
    const expectedDate = detail.nextFollowUpDate;

    setFollowUpResult(null);

    startFollowUpTransition(async () => {
      const result = await completeLeadFollowUp(detail.id, expectedDate);
      setFollowUpResult(result);

      if (!result.ok) return;

      const refreshed = await loadLeadDetails(detail.id);
      if (refreshed.ok) {
        setDetail(refreshed.lead);
        setStatusDraft(refreshed.lead.status);
        setFollowUpDraft(refreshed.lead.nextFollowUpDate ?? "");
      }
      onLeadMutated();
    });
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || note.trim() === "") return;

    setNoteResult(null);

    startNoteTransition(async () => {
      const result = await addLeadNote(detail.id, note);
      setNoteResult(result);

      if (!result.ok) return;

      setNote("");
      const refreshed = await loadLeadDetails(detail.id);
      if (refreshed.ok) {
        setDetail(refreshed.lead);
      }
      onLeadMutated();
    });
  }

  const followUpState = getLeadFollowUpState(detail?.nextFollowUpDate ?? null);
  const titleId = "lead-drawer-title";

  return (
    <>
      <button
        type="button"
        aria-label="Close lead details"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-line bg-surface shadow-[0_0_60px_rgba(0,0,0,.28)] focus:outline-none"
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-[16px] font-semibold">
              {detail?.businessName ?? (loading ? "Loading lead…" : "Lead details")}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              {detail?.category ?? "Business lead"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close lead details"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-field hover:text-ink"
          >
            <XIcon size={17} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4" aria-busy={loading}>
          {loading && !detail ? (
            <div className="space-y-4" aria-live="polite">
              <span className="sr-only">Loading lead details…</span>
              <div className="h-24 animate-pulse rounded-xl bg-field" />
              <div className="h-16 animate-pulse rounded-xl bg-field" />
              <div className="h-32 animate-pulse rounded-xl bg-field" />
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-[13px] font-medium">Could not load this lead</p>
              <p className="mt-1 text-[12px] text-muted">{error}</p>
              <button
                type="button"
                onClick={reloadDetails}
                className={`${secondaryButtonClasses} mt-3`}
              >
                Try again
              </button>
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <section aria-labelledby="lead-contact-heading">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3
                    id="lead-contact-heading"
                    className="text-[12px] font-semibold"
                  >
                    Business details
                  </h3>
                  <StatusBadge status={detail.status} />
                </div>

                <dl className="grid gap-3 rounded-xl border border-line bg-field/50 p-3 sm:grid-cols-2">
                  <DetailItem label="Phone">
                    {detail.phone ? (
                      <a className="hover:text-ink" href={`tel:${detail.phone}`}>
                        {detail.phone}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </DetailItem>
                  <DetailItem label="Email">
                    {detail.email ? (
                      <a className="hover:text-ink" href={`mailto:${detail.email}`}>
                        {detail.email}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </DetailItem>
                  <DetailItem label="Website">
                    {detail.website ? (
                      isHttpUrl(detail.website) ? (
                        <a
                          className="break-all hover:text-ink"
                          href={detail.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {displayWebsite(detail.website)}
                        </a>
                      ) : (
                        <span className="break-all">
                          {displayWebsite(detail.website)}
                        </span>
                      )
                    ) : (
                      "Not available"
                    )}
                  </DetailItem>
                  <DetailItem label="Location">
                    {detail.location ?? "Not available"}
                  </DetailItem>
                  <DetailItem label="Added">
                    {formatLeadDate(detail.createdAt) ?? "—"}
                  </DetailItem>
                  <DetailItem label="Last contact">
                    {formatLeadDate(detail.lastContactedAt) ?? "Not contacted"}
                  </DetailItem>
                </dl>
              </section>

              <section
                aria-labelledby="lead-status-heading"
                className="rounded-xl border border-line p-3"
              >
                <h3 id="lead-status-heading" className="text-[12px] font-semibold">
                  Lead status
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Lead status"
                    value={statusDraft}
                    onChange={(event) =>
                      setStatusDraft(event.target.value as LeadStatus)
                    }
                    disabled={statusPending}
                    className="h-[32px] rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none disabled:opacity-60"
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
                    disabled={statusPending || statusDraft === detail.status}
                    className={buttonClasses}
                  >
                    {statusPending ? "Saving…" : "Save status"}
                  </button>
                </div>
                <div className="mt-2">
                  <Feedback result={statusResult} />
                </div>
              </section>

              <section
                aria-labelledby="lead-follow-up-heading"
                className="rounded-xl border border-line p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id="lead-follow-up-heading"
                    className="text-[12px] font-semibold"
                  >
                    Next follow-up
                  </h3>
                  <FollowUpLabel
                    date={detail.nextFollowUpDate}
                    completedAt={detail.followUpCompletedAt}
                  />
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="date"
                    aria-label="Next follow-up date"
                    value={followUpDraft}
                    onChange={(event) => setFollowUpDraft(event.target.value)}
                    disabled={followUpPending}
                    className={`${fieldClasses} sm:flex-1`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFollowUpSave(followUpDraft || null)}
                      disabled={
                        followUpPending ||
                        (followUpDraft || null) ===
                          (detail.nextFollowUpDate || null)
                      }
                      className={buttonClasses}
                    >
                      {followUpPending ? "Saving…" : "Save date"}
                    </button>
                    {detail.nextFollowUpDate ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setFollowUpDraft("");
                            handleFollowUpSave(null);
                          }}
                          disabled={followUpPending}
                          className={secondaryButtonClasses}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={handleCompleteFollowUp}
                          disabled={followUpPending}
                          className={secondaryButtonClasses}
                        >
                          Complete
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-faint">
                  Follow-ups have a date but no time of day. Completing one clears
                  the next date and records it in the activity history.
                </p>
                <div className="mt-2">
                  <Feedback result={followUpResult} />
                </div>
              </section>
              <section
                aria-labelledby="lead-message-heading"
                className="rounded-xl border border-line p-3"
              >
               <h3 id="lead-message-heading" className="text-[12px] font-semibold">
                 Message
               </h3>
               <p className="mt-0.5 mb-2 text-[11px] text-faint">
                Pick a template, copy it, then contact the business yourself.
               </p>
              <TemplatePicker key={detail.id} leadId={detail.id} />
              </section>
              <section aria-labelledby="lead-note-heading">
                <h3 id="lead-note-heading" className="text-[12px] font-semibold">
                  Add a note
                </h3>
                <form onSubmit={handleNoteSubmit} className="mt-2 space-y-2">
                  <textarea
                    aria-label="Lead note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={MAX_NOTE_LENGTH}
                    rows={3}
                    disabled={notePending}
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
              </section>

              <section aria-labelledby="lead-activity-heading">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3
                    id="lead-activity-heading"
                    className="text-[12px] font-semibold"
                  >
                    Activity history
                  </h3>
                  <span className="text-[11px] text-faint">
                    {detail.activities.length} recent
                  </span>
                </div>

                {detail.activities.length === 0 ? (
                  <p className="rounded-xl border border-line bg-field p-3 text-[12px] text-muted">
                    No activity has been recorded yet.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {detail.activities.map((activity) => (
                      <li
                        key={activity.id}
                        className="rounded-xl border border-line bg-field/60 p-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[11px] font-medium text-muted">
                            {activity.label}
                          </p>
                          <time
                            dateTime={activity.createdAt}
                            className="text-[10px] text-faint"
                          >
                            {formatLeadTimestamp(activity.createdAt) ??
                              "Unknown date"}
                          </time>
                        </div>
                        {activity.body !== activity.label ? (
                          <p className="mt-1 break-words whitespace-pre-wrap text-[12px] text-foreground">
                            {activity.body}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {followUpState === "overdue" ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-300">
                  This follow-up is overdue. Reschedule or complete it when the
                  next action is clear.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
