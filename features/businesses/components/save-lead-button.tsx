"use client";

import { useState, useTransition } from "react";

import { BookmarkIcon, CheckCircleIcon } from "@/components/ui/icons";
import { saveBusinessAsLead } from "@/features/leads/actions";
import type { NormalizedBusiness } from "@/types/api";

/**
 * Per-result save control. Calls the server action with the normalized
 * business as returned by the search API; the server re-validates it and
 * derives the user from the session.
 */
export function SaveLeadButton({ business }: { business: NormalizedBusiness }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const result = await saveBusinessAsLead(business);
      setFailed(!result.ok);
      setMessage(result.message);
      if (result.ok) setSaved(true);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSave}
        disabled={pending || saved}
        className="flex h-[30px] items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-foreground disabled:opacity-60"
      >
        {saved ? <CheckCircleIcon size={14} /> : <BookmarkIcon size={14} />}
        {pending ? "Saving…" : saved ? "Saved" : "Save lead"}
      </button>

      {message ? (
        <p
          role="status"
          className={`max-w-[220px] text-right text-[11px] ${
            failed ? "text-red-400" : "text-muted"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
