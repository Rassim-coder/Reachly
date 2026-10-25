"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { NormalizedBusiness } from "@/types/api";

import { isLeadStatus } from "./lead-list";
import { isValidLeadId } from "./lead-detail";
import {
  parseSaveLeadsRpcResult,
  singleSaveMessage,
  toBulkSaveResult,
  type BulkSaveLeadsResult,
  type SaveLeadResult,
  type SaveLeadsOutcome,
} from "./save-result";
import {
  collectBusinessesForBulkSave,
  toBusinessPayload,
  validateBusinessInput,
  validateLeadNote,
} from "./validation";

/**
 * Saving a discovered business is a shared-data operation, so it goes through
 * the narrowly scoped `save_businesses_as_leads` database function rather than
 * the service-role client. The function derives ownership from auth.uid(),
 * never overwrites an existing shared business, and relies on the existing
 * unique constraints for duplicates.
 *
 * All user-owned reads and mutations below use the authenticated Supabase
 * client, so RLS remains in force.
 */

export type { BulkSaveLeadsResult, SaveLeadResult };

export type LeadMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Upper bound per bulk request; the client selects from results it has loaded. */
const MAX_BULK_SAVE = 500;
/** Keeps each RPC call and its transaction small. */
const BULK_CHUNK_SIZE = 50;

const RPC_UNAVAILABLE_MESSAGE =
  "Saving leads is not configured yet. Apply docs/sql/save_lead_function.sql in Supabase first.";

function isMissingSaveFunction(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function|function .* does not exist/i.test(
      error.message ?? "",
    )
  );
}

function revalidateSavedLeads(leadId?: string) {
  revalidatePath("/my-leads");
  if (leadId) revalidatePath(`/my-leads/${leadId}`);
  revalidatePath("/");
}

export async function saveBusinessAsLead(
  input: NormalizedBusiness,
): Promise<SaveLeadResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to save leads." };
  }

  const cleaned = validateBusinessInput(input);

  if (!cleaned.ok) {
    return { ok: false, message: cleaned.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_businesses_as_leads", {
    p_businesses: [toBusinessPayload(cleaned.value)] as Json,
  });

  if (error) {
    if (isMissingSaveFunction(error)) {
      return { ok: false, message: RPC_UNAVAILABLE_MESSAGE };
    }

    console.error("saveBusinessAsLead: RPC failed", error);
    return { ok: false, message: "Could not save this lead. Please try again." };
  }

  const outcome = parseSaveLeadsRpcResult(data);

  if (!outcome) {
    console.error("saveBusinessAsLead: unexpected RPC result", data);
    return { ok: false, message: "Could not save this lead. Please try again." };
  }

  if (outcome.added > 0) {
    revalidateSavedLeads();
  }

  return singleSaveMessage(outcome);
}

/**
 * Save a user-selected batch of discovered businesses as leads.
 *
 * Existing invalid inputs are counted as failures. Valid items are deduplicated
 * by source id, split into chunks, and saved through the same RPC as a single
 * save. One failed chunk does not discard the results of the others.
 */
export async function saveBusinessesAsLeads(
  inputs: NormalizedBusiness[],
): Promise<BulkSaveLeadsResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to save leads." };
  }

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { ok: false, message: "Select at least one business." };
  }

  if (inputs.length > MAX_BULK_SAVE) {
    return {
      ok: false,
      message: `Select ${MAX_BULK_SAVE} businesses or fewer at a time.`,
    };
  }

  const { businesses, failed: invalidInputs } =
    collectBusinessesForBulkSave(inputs);

  if (businesses.length === 0) {
    return {
      ok: true,
      added: 0,
      existing: 0,
      failed: invalidInputs,
      total: invalidInputs,
    };
  }

  const supabase = await createClient();
  let added = 0;
  let existing = 0;
  let failed = invalidInputs;

  for (let start = 0; start < businesses.length; start += BULK_CHUNK_SIZE) {
    const chunk = businesses.slice(start, start + BULK_CHUNK_SIZE);

    const { data, error } = await supabase.rpc("save_businesses_as_leads", {
      p_businesses: chunk.map(toBusinessPayload) as Json,
    });

    if (error) {
      if (isMissingSaveFunction(error)) {
        return { ok: false, message: RPC_UNAVAILABLE_MESSAGE };
      }

      console.error("saveBusinessesAsLeads: RPC failed", error);
      failed += chunk.length;
      continue;
    }

    const outcome = parseSaveLeadsRpcResult(data);

    if (!outcome) {
      console.error("saveBusinessesAsLeads: unexpected RPC result", data);
      failed += chunk.length;
      continue;
    }

    added += outcome.added;
    existing += outcome.existing;
    failed += outcome.failed;
  }

  if (added > 0) {
    revalidateSavedLeads();
  }

  return toBulkSaveResult({
    added,
    existing,
    failed,
    total: added + existing + failed,
  } satisfies SaveLeadsOutcome);
}

export async function updateLeadStatus(
  leadId: string,
  status: string,
): Promise<LeadMutationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to update leads." };
  }

  if (!isValidLeadId(leadId) || !isLeadStatus(status)) {
    return { ok: false, message: "The lead status update is invalid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("updateLeadStatus: update failed", error);
    return { ok: false, message: "Could not update this lead. Please try again." };
  }

  if (!data) {
    return { ok: false, message: "Lead not found." };
  }

  revalidateSavedLeads(leadId);

  return { ok: true, message: "Lead status updated." };
}

export async function addLeadNote(
  leadId: string,
  body: string,
): Promise<LeadMutationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to add notes." };
  }

  if (!isValidLeadId(leadId)) {
    return { ok: false, message: "Lead not found." };
  }

  const cleaned = validateLeadNote(body);

  if (!cleaned.ok) {
    return { ok: false, message: cleaned.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    user_id: user.id,
    kind: "note",
    body: cleaned.value,
  });

  if (error) {
    // The composite (lead_id, user_id) foreign key and the insert policy both
    // prevent attaching a note to another user's lead.
    if (error.code === "23503" || error.code === "42501") {
      return { ok: false, message: "Lead not found." };
    }

    console.error("addLeadNote: insert failed", error);
    return { ok: false, message: "Could not add this note. Please try again." };
  }

  revalidateSavedLeads(leadId);

  return { ok: true, message: "Note added." };
}
