import { decodeTemplateContent } from "./storage.ts";
import type { TemplateItem } from "./Types.ts";
import { isTemplateChannel } from "./validation.ts";

/**
 * Typed as `string` on purpose, like `leadListSelect`, so the query result is
 * mapped by hand instead of being parsed against generated relationship types.
 */
export const TEMPLATE_SELECT: string =
  "id, name, channel, body, created_at, updated_at";

export type TemplateRow = {
  id: string;
  name: string;
  channel: string;
  body: string | null;
  created_at: string;
  updated_at: string | null;
};

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Returns null for rows that cannot be shown safely (bad channel, no name/body). */
export function mapTemplateRow(row: TemplateRow): TemplateItem | null {
  // Rows using another channel (for example `call_script`) are not shown.
  if (!isTemplateChannel(row.channel)) return null;

  const name = cleanText(row.name);
  const stored = cleanText(row.body);

  if (!name || !stored) return null;

  const { subject, body } = decodeTemplateContent(row.channel, stored);

  if (!body) return null;

  return {
    id: row.id,
    name,
    channel: row.channel,
    subject,
    body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** One-line preview of a message body for the template cards. */
export function templatePreview(body: string, maxLength = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();

  return flat.length > maxLength
    ? `${flat.slice(0, maxLength).trimEnd()}…`
    : flat;
}