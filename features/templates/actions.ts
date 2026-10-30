"use server";

import { revalidatePath } from "next/cache";

import { isValidLeadId } from "@/features/leads/lead-detail";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  mapTemplateRow,
  TEMPLATE_SELECT,
  type TemplateRow,
} from "./mapping";
import { encodeTemplateContent } from "./storage";
import type { TemplateItem, TemplateLeadContext } from "./Types";
import {
  duplicateTemplateName,
  isValidTemplateId,
  validateTemplateInput,
} from "./validation";

export type TemplateMutationResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

export type LeadTemplateContextResult =
  | { ok: true; context: TemplateLeadContext }
  | { ok: false; message: string };

const UNIQUE_VIOLATION = "23505";

type BusinessContactRow = {
  name: string | null;
  category: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
};

function fail(message: string): TemplateMutationResult {
  return { ok: false, message };
}

function revalidateTemplates() {
  revalidatePath("/templates");
}

export async function createTemplate(
  input: unknown,
): Promise<TemplateMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to create templates.");

  const cleaned = validateTemplateInput(input);
  if (!cleaned.ok) return fail(cleaned.message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      user_id: user.id,
      name: cleaned.value.name,
      channel: cleaned.value.channel,
      body: encodeTemplateContent(cleaned.value),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("You already have a template with that name.");
    }
    console.error("createTemplate: insert failed", error);
    return fail("Could not create the template. Please try again.");
  }

  revalidateTemplates();
  return {
    ok: true,
    message: `Template "${cleaned.value.name}" created.`,
    id: data.id,
  };
}

export async function updateTemplate(
  templateId: string,
  input: unknown,
): Promise<TemplateMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to edit templates.");

  if (!isValidTemplateId(templateId)) return fail("This template is invalid.");

  const cleaned = validateTemplateInput(input);
  if (!cleaned.ok) return fail(cleaned.message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .update({
      name: cleaned.value.name,
      channel: cleaned.value.channel,
      body: encodeTemplateContent(cleaned.value),
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("You already have a template with that name.");
    }
    console.error("updateTemplate: update failed", error);
    return fail("Could not save the template. Please try again.");
  }

  if (!data) return fail("Template not found.");

  revalidateTemplates();
  return { ok: true, message: "Template saved.", id: data.id };
}

export async function duplicateTemplate(
  templateId: string,
): Promise<TemplateMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to duplicate templates.");

  if (!isValidTemplateId(templateId)) return fail("This template is invalid.");

  const supabase = await createClient();

  const { data: rows, error: readError } = await supabase
    .from("message_templates")
    .select(TEMPLATE_SELECT)
    .eq("user_id", user.id);

  if (readError) {
    console.error("duplicateTemplate: read failed", readError);
    return fail("Could not duplicate the template. Please try again.");
  }

  const all = (rows ?? []) as unknown as TemplateRow[];
  const original = all.find((row) => row.id === templateId);
  const mapped = original ? mapTemplateRow(original) : null;

  if (!mapped) return fail("Template not found.");

  const name = duplicateTemplateName(
    mapped.name,
    all.map((row) => row.name),
  );

  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      user_id: user.id,
      name,
      channel: mapped.channel,
      body: encodeTemplateContent(mapped),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail("A copy with that name already exists. Try again.");
    }
    console.error("duplicateTemplate: insert failed", error);
    return fail("Could not duplicate the template. Please try again.");
  }

  revalidateTemplates();
  return { ok: true, message: `Created "${name}".`, id: data.id };
}

export async function deleteTemplate(
  templateId: string,
): Promise<TemplateMutationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to delete templates.");

  if (!isValidTemplateId(templateId)) return fail("This template is invalid.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("deleteTemplate: delete failed", error);
    return fail("Could not delete the template. Please try again.");
  }

  if (!data) return fail("Template not found.");

  revalidateTemplates();
  return { ok: true, message: "Template deleted." };
}

/** Templates offered by the lead drawer selector. Returns null on failure. */
export async function listTemplatesForPicker(): Promise<TemplateItem[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select(TEMPLATE_SELECT)
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("listTemplatesForPicker: failed to read templates", error);
    return null;
  }

  return ((data ?? []) as unknown as TemplateRow[])
    .map((row) => mapTemplateRow(row))
    .filter((template): template is TemplateItem => template !== null);
}

/**
 * Real values used to personalize a template for one owned lead. A missing
 * lead, or one owned by someone else, is reported as not found.
 */
export async function getLeadTemplateContext(
  leadId: string,
): Promise<LeadTemplateContextResult> {
  if (!isValidLeadId(leadId)) return { ok: false, message: "Lead not found." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to use templates." };

  const supabase = await createClient();

  const [leadResult, profileResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, businesses!leads_business_id_fkey (name, category, city, phone, email)",
      )
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (leadResult.error) {
    console.error("getLeadTemplateContext: read failed", leadResult.error);
    return { ok: false, message: "Could not load this lead. Please try again." };
  }

  if (profileResult.error) {
    // The message can still be written by hand, so this is not fatal.
    console.error("getLeadTemplateContext: profile read failed", profileResult.error);
  }

  const row = leadResult.data as unknown as {
    businesses:
      | BusinessContactRow
      | BusinessContactRow[]
      | null;
  } | null;

  const business = Array.isArray(row?.businesses)
    ? (row?.businesses[0] ?? null)
    : (row?.businesses ?? null);
  const businessName = business?.name?.trim();

  if (!businessName) return { ok: false, message: "Lead not found." };

  return {
    ok: true,
    context: {
      businessName,
      category: business?.category?.trim() || null,
      city: business?.city?.trim() || null,
      phone: business?.phone?.trim() || null,
      email: business?.email?.trim() || null,
      contactName: null,
      yourName: profileResult.data?.full_name?.trim() || null,
      myCompany: null,
    },
  };
}