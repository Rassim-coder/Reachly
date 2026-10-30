"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ArrowUpRightIcon } from "@/components/ui/icons";
import { Card, EmptyState } from "@/components/ui/page-shell";
import { LeadDrawer } from "@/features/leads/components/lead-drawer";
import { LeadTable } from "@/features/leads/components/lead-list";
import type { LeadListItem } from "@/features/leads/lead-list";
import {
  deselectIds,
  setPageSelection,
  toggleSelectedLead,
} from "@/features/leads/lead-selection";

import { removeLeadsFromList, type ListMutationResult } from "../actions";
import { ListFeedback } from "./list-feedback";

const primaryButtonClasses =
  "inline-flex h-[32px] items-center justify-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

export function ListLeadsWorkspace({
  listId,
  leads,
}: {
  listId: string;
  leads: LeadListItem[];
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<ListMutationResult | null>(null);
  const [pending, startTransition] = useTransition();

  const pageIds = leads.map((lead) => lead.id);
  const pageIdSet = new Set(pageIds);
  // Ignore selected ids that are no longer part of the list after a refresh.
  const visibleSelected = new Set(
    [...selectedIds].filter((id) => pageIdSet.has(id)),
  );

  function handleRemove() {
    const ids = [...visibleSelected];
    if (ids.length === 0) return;

    setFeedback(null);

    startTransition(async () => {
      const next = await removeLeadsFromList(listId, ids);
      setFeedback(next);

      if (next.ok) {
        const removed = next.affectedIds ?? [];
        setSelectedIds((current) => deselectIds(current, removed));
        if (selectedLeadId && removed.includes(selectedLeadId)) {
          setSelectedLeadId(null);
        }
      }
    });
  }

  return (
    <>
      <ListFeedback result={feedback} />

      {visibleSelected.size > 0 ? (
        <section
          aria-label="List actions"
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card"
        >
          <div className="flex items-center gap-3">
            <p className="text-[12px] font-semibold" aria-live="polite">
              {visibleSelected.size} selected
            </p>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={pending}
              className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
            >
              Clear selection
            </button>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className={primaryButtonClasses}
          >
            {pending ? "Removing…" : "Remove from list"}
          </button>
        </section>
      ) : null}

      <Card>
        {leads.length === 0 ? (
          <EmptyState
            title="This list is empty"
            description="In My Leads, select leads and add them to this list."
            action={
              <Link
                href="/my-leads"
                className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
              >
                Go to My Leads <ArrowUpRightIcon size={11} />
              </Link>
            }
          />
        ) : (
          <LeadTable
            leads={leads}
            selectedIds={visibleSelected}
            onSelect={setSelectedLeadId}
            onToggleSelected={(leadId) =>
              setSelectedIds((current) => toggleSelectedLead(current, leadId))
            }
            onTogglePage={(checked) =>
              setSelectedIds((current) =>
                setPageSelection(current, pageIds, checked),
              )
            }
          />
        )}
      </Card>

      <LeadDrawer
        leadId={selectedLeadId}
        refreshToken={0}
        onClose={() => setSelectedLeadId(null)}
        onLeadMutated={() => router.refresh()}
      />
    </>
  );
}
