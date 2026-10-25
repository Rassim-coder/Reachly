"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import {
  Card,
  CardHeader,
  EmptyState,
} from "@/components/ui/page-shell";
import {
  completeLeadFollowUp,
  updateLeadFollowUp,
  type LeadMutationResult,
} from "@/features/leads/actions";
import { LeadDrawer } from "@/features/leads/components/lead-drawer";
import { StatusBadge } from "@/features/leads/components/lead-list";
import {
  displayWebsite,
  formatLeadDate,
  formatLeadTimestamp,
  isHttpUrl,
} from "@/features/leads/lead-list";
import type { FollowUpItem, FollowUpQueue } from "../follow-up-queue";

const fieldClasses =
  "h-[32px] min-w-0 rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClasses =
  "inline-flex h-[32px] w-fit items-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClasses =
  "inline-flex h-[32px] w-fit items-center rounded-full border border-line bg-surface px-3.5 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

type Feedback = {
  tone: "success" | "warning" | "error";
  message: string;
};

function SummaryCard({
  label,
  count,
  description,
  tone,
}: {
  label: string;
  count: number;
  description: string;
  tone: "overdue" | "today" | "upcoming";
}) {
  const toneClasses = {
    overdue: "border-red-500/30 bg-red-500/5 text-red-300",
    today: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    upcoming: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-[12px] font-medium">{label}</p>
      <p className="mt-1 text-[24px] leading-tight font-bold text-foreground">
        {count}
      </p>
      <p className="mt-0.5 text-[11px] text-faint">{description}</p>
    </div>
  );
}

function FeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback: Feedback;
  onDismiss: () => void;
}) {
  const styles =
    feedback.tone === "error"
      ? "border-red-500/30 bg-red-500/5 text-red-300"
      : feedback.tone === "warning"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
        : "border-positive/30 bg-positive-soft text-positive";

  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mb-3 flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-[12px] ${styles}`}
    >
      <p>{feedback.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Dismiss
      </button>
    </div>
  );
}

function FollowUpRow({
  lead,
  pending,
  busy,
  onOpen,
  onReschedule,
  onComplete,
}: {
  lead: FollowUpItem;
  pending: boolean;
  busy: boolean;
  onOpen: (leadId: string) => void;
  onReschedule: (lead: FollowUpItem, nextDate: string) => void;
  onComplete: (lead: FollowUpItem) => void;
}) {
  const [dateDraft, setDateDraft] = useState(lead.nextFollowUpDate ?? "");
  const description = [lead.category, lead.location]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const dateInputId = `follow-up-date-${lead.id}`;
  const unchanged = dateDraft === (lead.nextFollowUpDate ?? "");

  function handleReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dateDraft.trim() === "" || unchanged) return;

    onReschedule(lead, dateDraft);
  }

  return (
    <li
      aria-busy={pending}
      className="rounded-xl border border-line bg-field/40 p-3"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(lead.id)}
              className="min-w-0 truncate text-left text-[14px] font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {lead.businessName}
            </button>
            <StatusBadge status={lead.status} />
          </div>

          <p className="mt-0.5 text-[12px] text-muted">
            {description || "No category or location provided."}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {lead.phone}
              </a>
            ) : null}

            {lead.website ? (
              isHttpUrl(lead.website) ? (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {displayWebsite(lead.website)}
                </a>
              ) : (
                <span className="break-all text-muted">
                  {displayWebsite(lead.website)}
                </span>
              )
            ) : null}

            {!lead.phone && !lead.website ? (
              <span className="text-faint">
                No phone or website available.
              </span>
            ) : null}
          </div>

          {lead.latestNote ? (
            <div className="mt-2 rounded-lg border border-line bg-surface/60 p-2.5">
              <p className="text-[10px] font-medium tracking-[.06em] text-faint uppercase">
                Latest note
              </p>
              <p className="mt-0.5 line-clamp-2 break-words text-[12px] text-muted">
                {lead.latestNote.body}
              </p>
              <time
                dateTime={lead.latestNote.createdAt}
                className="mt-1 block text-[10px] text-faint"
              >
                {formatLeadTimestamp(lead.latestNote.createdAt) ??
                  "Unknown date"}
              </time>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 xl:w-[330px]">
          <p className="text-[12px] font-medium text-muted">
            Scheduled for{" "}
            <time dateTime={lead.nextFollowUpDate ?? undefined}>
              {formatLeadDate(lead.nextFollowUpDate) ?? "Unknown date"}
            </time>
          </p>

          <form onSubmit={handleReschedule}>
            <label htmlFor={dateInputId} className="sr-only">
              New follow-up date for {lead.businessName}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={dateInputId}
                type="date"
                value={dateDraft}
                onChange={(event) => setDateDraft(event.target.value)}
                required
                disabled={busy}
                className={`${fieldClasses} flex-1`}
              />
              <button
                type="submit"
                disabled={busy || unchanged || dateDraft.trim() === ""}
                className={primaryButtonClasses}
              >
                Reschedule
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onComplete(lead)}
              disabled={busy}
              className={secondaryButtonClasses}
            >
              Mark completed
            </button>
            <button
              type="button"
              onClick={() => onOpen(lead.id)}
              disabled={busy}
              className={secondaryButtonClasses}
            >
              Open lead
            </button>
            {pending ? (
              <span role="status" className="text-[11px] text-faint">
                Updating…
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function FollowUpSection({
  title,
  description,
  emptyMessage,
  items,
  pendingLeadId,
  onOpen,
  onReschedule,
  onComplete,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  items: FollowUpItem[];
  pendingLeadId: string | null;
  onOpen: (leadId: string) => void;
  onReschedule: (lead: FollowUpItem, nextDate: string) => void;
  onComplete: (lead: FollowUpItem) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-line bg-field px-2 py-0.5 text-[11px] font-semibold text-muted">
            {items.length}
          </span>
        }
      />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-field/40 p-3 text-[12px] text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((lead) => (
            <FollowUpRow
              key={`${lead.id}:${lead.nextFollowUpDate ?? "none"}`}
              lead={lead}
              pending={pendingLeadId === lead.id}
              busy={pendingLeadId !== null}
              onOpen={onOpen}
              onReschedule={onReschedule}
              onComplete={onComplete}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FollowUpsQueue({
  initial,
  notesWarning,
}: {
  initial: FollowUpQueue;
  notesWarning: string | null;
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const actionLockRef = useRef(false);
  const [, startActionTransition] = useTransition();

  const closeDrawer = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  const openLead = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
  }, []);

  const handleLeadMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  function runAction(
    leadId: string,
    action: () => Promise<LeadMutationResult>,
  ): void {
    if (actionLockRef.current) return;

    actionLockRef.current = true;
    setFeedback(null);
    setPendingLeadId(leadId);

    startActionTransition(async () => {
      try {
        const result = await action();
        setFeedback({
          tone: result.ok
            ? result.message.includes("activity history could not be recorded")
              ? "warning"
              : "success"
            : "error",
          message: result.message,
        });

        if (result.ok) {
          router.refresh();
        }
      } catch {
        setFeedback({
          tone: "error",
          message: "Could not update this follow-up. Please try again.",
        });
      } finally {
        actionLockRef.current = false;
        setPendingLeadId(null);
      }
    });
  }

  function handleReschedule(lead: FollowUpItem, nextDate: string): void {
    if (nextDate === (lead.nextFollowUpDate ?? "")) {
      setFeedback({
        tone: "error",
        message: "Choose a different follow-up date.",
      });
      return;
    }

    runAction(lead.id, () => updateLeadFollowUp(lead.id, nextDate));
  }

  function handleComplete(lead: FollowUpItem): void {
    runAction(lead.id, () => completeLeadFollowUp(lead.id));
  }

  const sections: Array<{
    title: string;
    description: string;
    emptyMessage: string;
    items: FollowUpItem[];
  }> = [
    {
      title: "Overdue",
      description: "Scheduled before today. Reschedule or complete these first.",
      emptyMessage: "No overdue follow-ups.",
      items: initial.overdue,
    },
    {
      title: "Today",
      description: "Scheduled for today.",
      emptyMessage: "No follow-ups due today.",
      items: initial.today,
    },
    {
      title: "Upcoming",
      description: "Scheduled after today, nearest first.",
      emptyMessage: "No upcoming follow-ups.",
      items: initial.upcoming,
    },
  ];

  return (
    <>
      <section
        aria-label="Follow-up summary"
        aria-live="polite"
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <SummaryCard
          label="Overdue"
          count={initial.counts.overdue}
          description="Before today"
          tone="overdue"
        />
        <SummaryCard
          label="Today"
          count={initial.counts.today}
          description="Due today"
          tone="today"
        />
        <SummaryCard
          label="Upcoming"
          count={initial.counts.upcoming}
          description="After today"
          tone="upcoming"
        />
      </section>

      {notesWarning ? (
        <div
          role="status"
          className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-200"
        >
          {notesWarning}
        </div>
      ) : null}

      {feedback ? (
        <FeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      {initial.total === 0 ? (
        <Card>
          <EmptyState
            title="No follow-ups scheduled"
            description="Schedule a follow-up from a business in My Leads, then it will appear here with its due date."
            action={
              <Link
                href="/my-leads"
                className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
              >
                Go to My Leads <ArrowUpRightIcon size={11} />
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <FollowUpSection
              key={section.title}
              title={section.title}
              description={section.description}
              emptyMessage={section.emptyMessage}
              items={section.items}
              pendingLeadId={pendingLeadId}
              onOpen={openLead}
              onReschedule={handleReschedule}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      <LeadDrawer
        leadId={selectedLeadId}
        refreshToken={0}
        onClose={closeDrawer}
        onLeadMutated={handleLeadMutated}
      />
    </>
  );
}
