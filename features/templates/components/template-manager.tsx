"use client";

import { useMemo, useState, useTransition } from "react";

import { Card, CardHeader, EmptyState } from "@/components/ui/page-shell";
import { formatLeadDate } from "@/features/leads/lead-list";

import {
  deleteTemplate,
  duplicateTemplate,
  type TemplateMutationResult,
} from "../actions";
import { templatePreview } from "../mapping";
import {
  TEMPLATE_CHANNEL_LABELS,
  TEMPLATE_CHANNELS,
  type TemplateChannel,
  type TemplateItem,
} from "../Types";
import { TemplateEditor } from "./template-editor";
import { TemplateFeedback } from "./template-feedback";

const fieldClasses =
  "h-[34px] w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const primaryButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const aiButtonClasses =
  "group inline-flex h-[34px] items-center justify-center gap-2 rounded-full border border-violet-300/40 bg-gradient-to-r from-[#7041f2] via-[#8249f5] to-[#a044e8] px-4 text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(124,58,237,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(168,85,247,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const secondaryButtonClasses =
  "inline-flex h-[30px] items-center justify-center rounded-full border border-line bg-surface px-3 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

const dangerButtonClasses =
  "inline-flex h-[30px] items-center justify-center rounded-full bg-red-600 px-3 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const channelStyles: Record<TemplateChannel, string> = {
  email: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  whatsapp: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

type EditorState = {
  template: TemplateItem | null;
  openAi?: boolean;
} | null;

export function TemplateManager({ templates }: { templates: TemplateItem[] }) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [notice, setNotice] = useState<TemplateMutationResult | null>(null);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<TemplateChannel | "all">("all");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (channel !== "all" && template.channel !== channel) return false;
      if (term === "") return true;

      return (
        template.name.toLowerCase().includes(term) ||
        template.body.toLowerCase().includes(term)
      );
    });
  }, [templates, search, channel]);

  const filtering = search.trim() !== "" || channel !== "all";

  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1 space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Search templates
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={100}
              placeholder="Name or message"
              className={fieldClasses}
            />
          </label>

          <label className="w-[150px] space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              Channel
            </span>
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as TemplateChannel | "all")
              }
              className={fieldClasses}
            >
              <option value="all">All channels</option>
              {TEMPLATE_CHANNELS.map((value) => (
                <option key={value} value={value}>
                  {TEMPLATE_CHANNEL_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setEditor({ template: null });
            }}
            className={primaryButtonClasses}
          >
            New template
          </button>
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setEditor({ template: null, openAi: true });
            }}
            className={aiButtonClasses}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 transition-transform group-hover:rotate-12"
            >
              <path d="M10 1.5 11.9 7l5.6 1.9-5.6 1.9L10 16.5l-1.9-5.7L2.5 8.9 8.1 7 10 1.5Z" />
              <path d="m16 12.5.9 2.6 2.6.9-2.6.9L16 19.5l-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" />
            </svg>
            Generate with AI
          </button>
        </div>
        <TemplateFeedback result={notice} />
      </Card>

      {editor ? (
        <TemplateEditor
          // Remounts the form when switching between templates.
          key={editor.template?.id ?? "new"}
          template={editor.template}
          onCancel={() => setEditor(null)}
          initialAiOpen={editor.openAi}
          onSaved={(result) => {
            setNotice(result);
            setEditor(null);
          }}
        />
      ) : null}

      <Card>
        <CardHeader
          title={
            templates.length === 0
              ? "My templates"
              : `${templates.length} ${templates.length === 1 ? "template" : "templates"}`
          }
          description="Reusable email and WhatsApp drafts. You copy them and send them yourself."
        />

        {templates.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description="Create a template, then use it from any saved lead."
            action={
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setEditor({ template: null, openAi: true });
                }}
                className={`${primaryButtonClasses} mt-3`}
              >
                Generate your first template with AI
              </button>
            }
          />
        ) : visible.length === 0 && filtering ? (
          <EmptyState
            title="No templates match"
            description="Try a different name or channel."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => {
                  setNotice(null);
                  setEditor({ template });
                }}
                onDeleted={(result) => {
                  setNotice(result);
                  if (editor?.template?.id === template.id) setEditor(null);
                }}
                onDuplicated={setNotice}
              />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDeleted,
  onDuplicated,
}: {
  template: TemplateItem;
  onEdit: () => void;
  onDeleted: (result: TemplateMutationResult) => void;
  onDuplicated: (result: TemplateMutationResult) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [result, setResult] = useState<TemplateMutationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    work: () => Promise<TemplateMutationResult>,
    onDone: (next: TemplateMutationResult) => void,
  ) {
    setResult(null);

    startTransition(async () => {
      let next: TemplateMutationResult;

      try {
        next = await work();
      } catch {
        next = {
          ok: false,
          message: "Could not reach the server. Please try again.",
        };
      }

      if (next.ok) onDone(next);
      else {
        setResult(next);
        setConfirmDelete(false);
      }
    });
  }

  const updated = formatLeadDate(template.updatedAt ?? template.createdAt);

  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-[13px] font-semibold">
          {template.name}
        </h3>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${channelStyles[template.channel]}`}
        >
          {TEMPLATE_CHANNEL_LABELS[template.channel]}
        </span>
      </div>

      {template.subject ? (
        <p className="mt-1.5 truncate text-[12px] font-medium text-muted">
          {template.subject}
        </p>
      ) : null}

      <p className="mt-1.5 line-clamp-3 flex-1 text-[12px] leading-relaxed text-muted">
        {templatePreview(template.body)}
      </p>

      <p className="mt-3 text-[11px] text-faint">
        {updated ? `Updated ${updated}` : "Not yet updated"}
      </p>

      {confirmDelete ? (
        <div className="mt-3 space-y-2">
          <p className="text-[12px] text-muted">Delete this template?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => run(() => deleteTemplate(template.id), onDeleted)}
              disabled={pending}
              className={dangerButtonClasses}
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={pending}
            className={secondaryButtonClasses}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              run(() => duplicateTemplate(template.id), onDuplicated)
            }
            disabled={pending}
            className={secondaryButtonClasses}
          >
            {pending ? "Working…" : "Duplicate"}
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setConfirmDelete(true);
            }}
            disabled={pending}
            className={secondaryButtonClasses}
          >
            Delete
          </button>
        </div>
      )}

      <TemplateFeedback result={result} />
    </li>
  );
}