"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";

import { Card, CardHeader } from "@/components/ui/page-shell";

import {
  createTemplate,
  updateTemplate,
  type TemplateMutationResult,
} from "../actions";
import { TEMPLATE_PLACEHOLDERS } from "../placeholders";
import {
  TEMPLATE_CHANNEL_LABELS,
  TEMPLATE_CHANNELS,
  type TemplateChannel,
  type TemplateItem,
} from "../Types";
import {
  MAX_TEMPLATE_BODY_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_SUBJECT_LENGTH,
} from "../validation";
import { PlaceholderPreview } from "./placeholder-preview";
import { TemplateFeedback } from "./template-feedback";

const fieldClasses =
  "w-full rounded-xl border border-line bg-field px-3 py-2 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const primaryButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const secondaryButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full border border-line bg-surface px-4 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

type Field = "subject" | "body";

function insertAt(
  value: string,
  element: HTMLInputElement | HTMLTextAreaElement | null,
  token: string,
): { next: string; caret: number } {
  const start = element?.selectionStart ?? value.length;
  const end = element?.selectionEnd ?? start;

  return {
    next: value.slice(0, start) + token + value.slice(end),
    caret: start + token.length,
  };
}

export function TemplateEditor({
  template,
  onCancel,
  onSaved,
}: {
  /** Null creates a new template. */
  template: TemplateItem | null;
  onCancel: () => void;
  onSaved: (result: TemplateMutationResult) => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<TemplateChannel>(
    template?.channel ?? "email",
  );
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [activeField, setActiveField] = useState<Field>("body");
  const [result, setResult] = useState<TemplateMutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isEmail = channel === "email";
  const target: Field = isEmail && activeField === "subject" ? "subject" : "body";

  function handleInsert(token: string) {
    const element = target === "subject" ? subjectRef.current : bodyRef.current;
    const current = target === "subject" ? subject : body;
    const limit =
      target === "subject" ? MAX_TEMPLATE_SUBJECT_LENGTH : MAX_TEMPLATE_BODY_LENGTH;
    const { next, caret } = insertAt(current, element, token);

    if (next.length > limit) return;

    if (target === "subject") setSubject(next);
    else setBody(next);

    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(caret, caret);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const input = { name, channel, subject, body };
      let next: TemplateMutationResult;

      try {
        next = template
          ? await updateTemplate(template.id, input)
          : await createTemplate(input);
      } catch {
        next = {
          ok: false,
          message: "Could not reach the server. Please try again.",
        };
      }

      if (next.ok) onSaved(next);
      else setResult(next);
    });
  }

  const canSave =
    !pending &&
    name.trim() !== "" &&
    body.trim() !== "" &&
    (!isEmail || subject.trim() !== "");

  return (
    <Card className="mb-4">
      <CardHeader
        title={template ? "Edit template" : "New template"}
        description="Templates are drafts you copy and send yourself. Reachly never sends messages."
      />

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="space-y-1">
              <span className="block text-[11px] font-medium text-muted">
                Template name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MAX_TEMPLATE_NAME_LENGTH}
                placeholder="e.g. First WhatsApp intro"
                className={fieldClasses}
              />
            </label>

            <fieldset className="space-y-1">
              <legend className="block text-[11px] font-medium text-muted">
                Channel
              </legend>
              <div className="flex h-[38px] rounded-xl border border-line bg-field p-0.5">
                {TEMPLATE_CHANNELS.map((value) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center rounded-[10px] px-3 text-[12px] font-medium transition-colors ${
                      channel === value
                        ? "bg-surface text-foreground shadow-card"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template-channel"
                      value={value}
                      checked={channel === value}
                      onChange={() => setChannel(value)}
                      className="sr-only"
                    />
                    {TEMPLATE_CHANNEL_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {isEmail ? (
            <label className="block space-y-1">
              <span className="block text-[11px] font-medium text-muted">
                Subject
              </span>
              <input
                ref={subjectRef}
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                onFocus={() => setActiveField("subject")}
                maxLength={MAX_TEMPLATE_SUBJECT_LENGTH}
                placeholder="e.g. A quick idea for {{business_name}}"
                className={fieldClasses}
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Message
            </span>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onFocus={() => setActiveField("body")}
              maxLength={MAX_TEMPLATE_BODY_LENGTH}
              rows={9}
              placeholder="Write your message…"
              className={fieldClasses}
            />
            <span className="block text-right text-[11px] text-faint">
              {body.length}/{MAX_TEMPLATE_BODY_LENGTH}
            </span>
          </label>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted">
              Insert a placeholder
              {isEmail ? ` into the ${target}` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder.key}
                  type="button"
                  title={placeholder.description}
                  // Keeps the caret in the field so the token lands where the user was typing.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleInsert(placeholder.token)}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:bg-field hover:text-ink"
                >
                  {placeholder.token}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-faint">
              Placeholders are replaced with real lead data when you use the
              template. Anything unavailable stays visible so you can edit it.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-medium text-muted">Preview</p>
          <div className="space-y-3 rounded-xl border border-line bg-field/40 p-4">
            {isEmail ? (
              <div className="border-b border-line pb-3">
                <p className="mb-1 text-[10px] font-medium tracking-[.06em] text-faint uppercase">
                  Subject
                </p>
                {subject.trim() === "" ? (
                  <p className="text-[12px] text-faint">No subject yet.</p>
                ) : (
                  <PlaceholderPreview text={subject} />
                )}
              </div>
            ) : null}
            {body.trim() === "" ? (
              <p className="text-[12px] text-faint">
                Your message preview appears here.
              </p>
            ) : (
              <PlaceholderPreview text={body} />
            )}
          </div>
          <p className="text-[11px] text-faint">
            Highlighted tokens are filled in automatically from the saved lead.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={!canSave} className={primaryButtonClasses}>
              {pending ? "Saving…" : template ? "Save changes" : "Create template"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
          </div>
          <TemplateFeedback result={result} />
        </div>
      </form>
    </Card>
  );
}