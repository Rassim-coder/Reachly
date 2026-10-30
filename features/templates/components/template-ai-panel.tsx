"use client";

import { useEffect, useRef, useState } from "react";

import type { TemplateChannel } from "../Types";
import {
  TEMPLATE_GOALS,
  TEMPLATE_LANGUAGES,
  TEMPLATE_TONES,
  type TemplateDraft,
  type TemplateGoal,
  type TemplateLanguage,
  type TemplateTone,
} from "../generation";
import { MAX_TEMPLATE_BODY_LENGTH, MAX_TEMPLATE_SUBJECT_LENGTH } from "../validation";

const fieldClasses =
  "w-full rounded-xl border border-line bg-field px-3 py-2 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";
const labelClasses = "block text-[11px] font-medium text-muted";
const primaryButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";
const secondaryButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full border border-line bg-surface px-4 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

const GOAL_LABELS: Record<TemplateGoal, string> = {
  introduce: "Introduce myself",
  offer_service: "Offer a service",
  follow_up: "Follow up (no reply)",
  meeting: "Ask for a meeting",
  reengage: "Re-engage a cold lead",
};

const TONE_LABELS: Record<TemplateTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  short_direct: "Short and direct",
};

const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  en: "English",
  fr: "French",
};

type Props = {
  channel: TemplateChannel;
  onClose: () => void;
  onUse: (draft: TemplateDraft, channel: TemplateChannel) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseMessage(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.error)) return null;
  return typeof payload.error.message === "string"
    ? payload.error.message
    : null;
}

export function TemplateAiPanel({ channel: initialChannel, onClose, onUse }: Props) {
  const [channel, setChannel] = useState(initialChannel);
  const [goal, setGoal] = useState<TemplateGoal>("introduce");
  const [tone, setTone] = useState<TemplateTone>("professional");
  const [language, setLanguage] = useState<TemplateLanguage>("en");
  const [offer, setOffer] = useState("");
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLSelectElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    channelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

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
      document.removeEventListener("keydown", handleKeyDown);
      abortRef.current?.abort();
      previousFocus?.focus();
    };
  }, [onClose]);

  async function generate() {
    if (pending) return;
    if (offer.trim() === "") {
      setError("Describe what you offer.");
      return;
    }

    setPending(true);
    setError(null);
    setCopyMessage(null);
    setDraft(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, goal, tone, language, offer, instructions }),
        signal: controller.signal,
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The server returned an invalid response. Please retry.");
      }

      if (!response.ok) {
        throw new Error(
          responseMessage(payload) ??
            "Could not generate the draft. Please try again.",
        );
      }

      if (
        !isRecord(payload) ||
        !isRecord(payload.draft) ||
        typeof payload.draft.body !== "string" ||
        (payload.draft.subject !== null &&
          typeof payload.draft.subject !== "string")
      ) {
        throw new Error("The server returned an invalid draft. Please retry.");
      }

      setDraft({
        subject: payload.draft.subject,
        body: payload.draft.body,
      });
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError(
        caught instanceof TypeError
          ? "Could not reach the server. Check your connection and try again."
          : caught instanceof Error
            ? caught.message
            : "Could not generate the draft. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    const text =
      channel === "email" && draft.subject
        ? `Subject: ${draft.subject}\n\n${draft.body}`
        : draft.body;

    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopyMessage("Draft copied.");
    } catch {
      setCopyMessage("Could not copy automatically. Select and copy the draft.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-ai-title"
        className="max-h-[min(90vh,850px)] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="template-ai-title" className="text-[16px] font-semibold">
              Generate with AI
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              Create a draft to review and edit before using.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClasses}
          >
            Cancel
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={labelClasses}>Channel</span>
            <select
              ref={channelRef}
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as TemplateChannel)
              }
              className={fieldClasses}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClasses}>Goal</span>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value as TemplateGoal)}
              className={fieldClasses}
            >
              {TEMPLATE_GOALS.map((value) => (
                <option key={value} value={value}>
                  {GOAL_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClasses}>Tone</span>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value as TemplateTone)}
              className={fieldClasses}
            >
              {TEMPLATE_TONES.map((value) => (
                <option key={value} value={value}>
                  {TONE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelClasses}>Language</span>
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as TemplateLanguage)
              }
              className={fieldClasses}
            >
              {TEMPLATE_LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {LANGUAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className={labelClasses}>What I offer (required)</span>
            <input
              type="text"
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              maxLength={200}
              required
              placeholder="e.g. I build websites for restaurants"
              className={fieldClasses}
            />
            <span className="block text-right text-[11px] text-faint">
              {offer.length}/200
            </span>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className={labelClasses}>Extra instructions (optional)</span>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={300}
              rows={2}
              className={fieldClasses}
            />
            <span className="block text-right text-[11px] text-faint">
              {instructions.length}/300
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={pending}
            className={primaryButtonClasses}
          >
            {pending ? "Writing your draft…" : error ? "Retry" : "Generate"}
          </button>
          {pending ? (
            <span role="status" className="text-[12px] text-muted">
              Writing your draft…
            </span>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-red-400">
            {error}
          </p>
        ) : null}

        {draft ? (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <p className="text-[11px] text-muted">
              AI-generated. Review before sending.
            </p>
            {channel === "email" ? (
              <label className="block space-y-1">
                <span className={labelClasses}>Subject</span>
                <input
                  type="text"
                  value={draft.subject ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, subject: event.target.value })
                  }
                  maxLength={MAX_TEMPLATE_SUBJECT_LENGTH}
                  className={fieldClasses}
                />
              </label>
            ) : null}
            <label className="block space-y-1">
              <span className={labelClasses}>Message</span>
              <textarea
                value={draft.body}
                onChange={(event) =>
                  setDraft({ ...draft, body: event.target.value })
                }
                maxLength={MAX_TEMPLATE_BODY_LENGTH}
                rows={7}
                className={fieldClasses}
              />
            </label>
            {copyMessage ? (
              <p role="status" className="text-[11px] text-muted">
                {copyMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onUse(draft, channel)}
                className={primaryButtonClasses}
              >
                Use this
              </button>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={pending}
                className={secondaryButtonClasses}
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => void copyDraft()}
                className={secondaryButtonClasses}
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
