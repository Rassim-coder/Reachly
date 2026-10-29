import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  mapTemplateRow,
  TEMPLATE_SELECT,
  type TemplateRow,
} from "./mapping";
import type { TemplateItem } from "./Types";

export type MyTemplatesResult =
  | { ok: true; templates: TemplateItem[] }
  | { ok: false; message: string };

/**
 * Returns the signed-in user's templates, most recently updated first. The
 * explicit `user_id` filter and the authenticated client scope the request;
 * RLS remains the database-level protection.
 */
export async function getMyTemplates(): Promise<MyTemplatesResult> {
  const user = await getCurrentUser();

  if (!user) return { ok: false, message: "Sign in to view your templates." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select(TEMPLATE_SELECT)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getMyTemplates: failed to read templates", error);
    return {
      ok: false,
      message: "Could not load your templates. Please try again.",
    };
  }

  const templates = ((data ?? []) as unknown as TemplateRow[])
    .map((row) => mapTemplateRow(row))
    .filter((template): template is TemplateItem => template !== null);

  return { ok: true, templates };
}