"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { Card, CardHeader, EmptyState } from "@/components/ui/page-shell";
import { formatLeadDate } from "@/features/leads/lead-list";

import {
  createList,
  deleteList,
  renameList,
  type ListMutationResult,
} from "../actions";
import type { ListSummary } from "../types";
import { MAX_LIST_NAME_LENGTH } from "../validation";
import { ListFeedback } from "./list-feedback";

const fieldClasses =
  "h-[34px] w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const primaryButtonClasses =
  "inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const secondaryButtonClasses =
  "inline-flex h-[30px] items-center justify-center rounded-full border border-line bg-surface px-3 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

const dangerButtonClasses =
  "inline-flex h-[30px] items-center justify-center rounded-full bg-red-600 px-3 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

export function ListManager({ lists }: { lists: ListSummary[] }) {
  const [name, setName] = useState("");
  const [result, setResult] = useState<ListMutationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const next = await createList(name);
      setResult(next);
      if (next.ok) setName("");
    });
  }

  return (
    <>
      <Card className="mb-4">
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="min-w-[220px] flex-1 space-y-1">
            <span className="block text-[11px] font-medium text-muted">
              New list name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_LIST_NAME_LENGTH}
              placeholder="e.g. Lebanese restaurants in Paris"
              className={fieldClasses}
            />
          </label>
          <button
            type="submit"
            disabled={pending || name.trim() === ""}
            className={primaryButtonClasses}
          >
            {pending ? "Creating…" : "Create list"}
          </button>
        </form>
        <ListFeedback result={result} />
      </Card>

      <Card>
        <CardHeader
          title={
            lists.length === 0
              ? "My lists"
              : `${lists.length} ${lists.length === 1 ? "list" : "lists"}`
          }
          description="Group your saved leads however you like."
        />

        {lists.length === 0 ? (
          <EmptyState
            title="No lists yet"
            description="Create a list above, then add leads to it from My Leads."
          />
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {lists.map((list) => (
              <ListRow key={list.id} list={list} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ListRow({ list }: { list: ListSummary }) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [draft, setDraft] = useState(list.name);
  const [result, setResult] = useState<ListMutationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const next = await renameList(list.id, draft);
      setResult(next);
      if (next.ok) setMode("view");
    });
  }

  function handleDelete() {
    setResult(null);

    startTransition(async () => {
      const next = await deleteList(list.id);
      setResult(next);
      if (!next.ok) setMode("view");
    });
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {mode === "rename" ? (
            <form onSubmit={handleRename} className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_LIST_NAME_LENGTH}
                aria-label="List name"
                autoFocus
                className={`${fieldClasses} w-[260px]`}
              />
              <button
                type="submit"
                disabled={pending || draft.trim() === ""}
                className={primaryButtonClasses}
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setMode("view")}
                disabled={pending}
                className={secondaryButtonClasses}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <Link
                href={`/lists/${list.id}`}
                className="block max-w-[420px] truncate text-[13px] font-semibold hover:underline"
              >
                {list.name}
              </Link>
              <p className="mt-0.5 text-[11px] text-muted">
                {list.leadCount} {list.leadCount === 1 ? "lead" : "leads"} ·
                Created {formatLeadDate(list.createdAt) ?? "—"}
              </p>
            </>
          )}
        </div>

        {mode === "view" ? (
          <div className="flex items-center gap-2">
            <Link href={`/lists/${list.id}`} className={secondaryButtonClasses}>
              Open
            </Link>
            <button
              type="button"
              onClick={() => {
                setDraft(list.name);
                setResult(null);
                setMode("rename");
              }}
              className={secondaryButtonClasses}
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setMode("delete");
              }}
              className={secondaryButtonClasses}
            >
              Delete
            </button>
          </div>
        ) : null}

        {mode === "delete" ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted">
              Delete this list? Its leads stay in My Leads.
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className={dangerButtonClasses}
            >
              {pending ? "Deleting…" : "Delete list"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={pending}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
      <ListFeedback result={result} />
    </li>
  );
}