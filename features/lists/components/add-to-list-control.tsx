"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { BulkLeadResult } from "@/features/leads/bulk";

import {
  addLeadsToList,
  getListOptions,
  type ListMutationResult,
} from "../actions";
import type { ListOption } from "../types";

const fieldClasses =
  "h-[32px] w-[170px] rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none disabled:opacity-60";

const primaryButtonClasses =
  "inline-flex h-[32px] items-center justify-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

/**
 * Adds the leads selected in My Leads to one of the user's lists. The result is
 * reported through the workspace's existing feedback banner.
 */
export function AddToListControl({
  selectedIds,
  disabled,
  onResult,
  onAdded,
}: {
  selectedIds: string[];
  disabled: boolean;
  onResult: (result: BulkLeadResult) => void;
  onAdded: () => void;
}) {
  const [options, setOptions] = useState<ListOption[] | null | undefined>(
    undefined,
  );
  const [listId, setListId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    getListOptions()
      .then((next) => {
        if (!cancelled) setOptions(next);
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAdd() {
    if (!listId || disabled || pending) return;

    const ids = [...selectedIds];

    startTransition(async () => {
      let result: ListMutationResult;

      try {
        result = await addLeadsToList(listId, ids);
      } catch {
        result = {
          ok: false,
          message: "Could not reach the server. Please try again.",
        };
      }

      onResult({
        ok: result.ok,
        tone: result.ok ? "success" : "error",
        message: result.message,
        requestedCount: ids.length,
        affectedIds: [],
        unchangedIds: [],
        failedIds: [],
      });

      if (result.ok) {
        setListId("");
        onAdded();
      }
    });
  }

  if (options === undefined) {
    return <span className="text-[11px] text-faint">Loading lists…</span>;
  }

  if (options === null) {
    return <span className="text-[11px] text-red-400">Lists unavailable</span>;
  }

  if (options.length === 0) {
    return (
      <Link href="/lists" className="text-[12px] text-primary hover:underline">
        Create a list first
      </Link>
    );
  }

  return (
    <>
      <label className="sr-only" htmlFor="bulk-add-to-list">
        Add selected leads to a list
      </label>
      <select
        id="bulk-add-to-list"
        value={listId}
        onChange={(event) => setListId(event.target.value)}
        disabled={disabled || pending}
        className={fieldClasses}
      >
        <option value="">Add to list…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled || pending || listId === ""}
        className={primaryButtonClasses}
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </>
  );
}