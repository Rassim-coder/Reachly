"use server";

import { revalidatePath } from "next/cache";

import { validateBulkLeadIds } from "@/features/leads/bulk";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { isValidListId, validateListName } from "./validation";
import type { ListOption } from "./types";

export type ListMutationResult =
  | { ok: true; message: string; id?: string; affectedIds?: string[] }
  | { ok: false; message: string };

const UNIQUE_VIOLATION = "23505";

function fail(message: string): ListMutationResult {
  return { ok: false, message };
}

function leadCount(count: number): string {
  return `${count} ${count === 1 ? "lead" : "leads"}`;
}

function revalidateLists(listId?: string) {
  revalidatePath("/lists");
  if (listId) revalidatePath(`/lists/${listId}`);
}

export async function createList(name: string): Promise<ListMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to create lists.");

  const cleaned = validateListName(name);
  if (!cleaned.ok) return fail(cleaned.message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .insert({ name: cleaned.value, user_id: user.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("You already have a list with that name.");
    }
    console.error("createList: insert failed", error);
    return fail("Could not create the list. Please try again.");
  }

  revalidateLists();
  return { ok: true, message: `List "${cleaned.value}" created.`, id: data.id };
}

export async function renameList(
  listId: string,
  name: string,
): Promise<ListMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to rename lists.");

  if (!isValidListId(listId)) return fail("This list is invalid.");

  const cleaned = validateListName(name);
  if (!cleaned.ok) return fail(cleaned.message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .update({ name: cleaned.value })
    .eq("id", listId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("You already have a list with that name.");
    }
    console.error("renameList: update failed", error);
    return fail("Could not rename the list. Please try again.");
  }

  if (!data) return fail("List not found.");

  revalidateLists(listId);
  return { ok: true, message: "List renamed." };
}

/** Deletes the list; its owned memberships cascade, but saved leads are kept. */
export async function deleteList(listId: string): Promise<ListMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to delete lists.");

  if (!isValidListId(listId)) return fail("This list is invalid.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .delete()
    .eq("id", listId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("deleteList: delete failed", error);
    return fail("Could not delete the list. Please try again.");
  }

  if (!data) return fail("List not found.");

  revalidateLists(listId);
  return { ok: true, message: "List deleted. Its leads were kept." };
}

/**
 * Adds owned leads to an owned list. Both ownerships are checked here, the
 * existing memberships are skipped so no duplicate is inserted, and the
 * composite foreign keys on `list_leads` enforce ownership again in the database.
 */
export async function addLeadsToList(
  listId: string,
  leadIds: string[],
): Promise<ListMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to update lists.");

  if (!isValidListId(listId)) return fail("This list is invalid.");

  const idCheck = validateBulkLeadIds(leadIds);
  if (!idCheck.ok) return fail(idCheck.message);

  const supabase = await createClient();

  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("id, name")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (listError) {
    console.error("addLeadsToList: list read failed", listError);
    return fail("Could not load the list. Please try again.");
  }

  if (!list) return fail("List not found.");

  const { data: owned, error: ownedError } = await supabase
    .from("leads")
    .select("id")
    .in("id", idCheck.ids)
    .eq("user_id", user.id);

  if (ownedError) {
    console.error("addLeadsToList: lead read failed", ownedError);
    return fail("Could not load the selected leads. Please try again.");
  }

  const ownedIds = (owned ?? []).map((row) => row.id.toLowerCase());
  const notFound = idCheck.ids.length - ownedIds.length;

  if (ownedIds.length === 0) {
    return fail("The selected leads could not be found.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("list_leads")
    .select("lead_id")
    .eq("list_id", list.id)
    .eq("user_id", user.id)
    .in("lead_id", ownedIds);

  if (existingError) {
    console.error("addLeadsToList: membership read failed", existingError);
    return fail("Could not update the list. Please try again.");
  }

  const existingSet = new Set(
    (existing ?? []).map((row) => row.lead_id.toLowerCase()),
  );
  const toAdd = ownedIds.filter((id) => !existingSet.has(id));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("list_leads").insert(
      toAdd.map((leadId) => ({
        list_id: list.id,
        lead_id: leadId,
        user_id: user.id,
      })),
    );

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION) {
        return fail("Some leads were already added. Refresh and try again.");
      }
      console.error("addLeadsToList: insert failed", insertError);
      return fail("Could not add the leads to the list. Please try again.");
    }
  }

  revalidateLists(list.id);

  const parts: string[] = [];
  if (toAdd.length > 0) {
    parts.push(`Added ${leadCount(toAdd.length)} to "${list.name}".`);
  }
  if (existingSet.size > 0) {
    parts.push(`${leadCount(existingSet.size)} already in the list.`);
  }
  if (notFound > 0) {
    parts.push(`${leadCount(notFound)} could not be added.`);
  }

  return { ok: true, message: parts.join(" "), id: list.id };
}

/** Removes memberships only. The saved leads themselves are not deleted. */
export async function removeLeadsFromList(
  listId: string,
  leadIds: string[],
): Promise<ListMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to update lists.");

  if (!isValidListId(listId)) return fail("This list is invalid.");

  const idCheck = validateBulkLeadIds(leadIds);
  if (!idCheck.ok) return fail(idCheck.message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("list_leads")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .in("lead_id", idCheck.ids)
    .select("lead_id");

  if (error) {
    console.error("removeLeadsFromList: delete failed", error);
    return fail("Could not remove the leads. Please try again.");
  }

  const removedIds = (data ?? []).map((row) => row.lead_id.toLowerCase());

  if (removedIds.length === 0) {
    return fail("Those leads are no longer in this list.");
  }

  revalidateLists(listId);

  return {
    ok: true,
    message: `Removed ${leadCount(removedIds.length)} from the list. The leads are still in My Leads.`,
    affectedIds: removedIds,
  };
}

/** Lists offered by the "Add to list" selector. Returns null on failure. */
export async function getListOptions(): Promise<ListOption[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("getListOptions: failed to read lists", error);
    return null;
  }

  return data ?? [];
}
