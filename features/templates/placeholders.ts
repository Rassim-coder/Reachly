/**
 * Pure placeholder handling for message templates.
 *
 * Substitution is a single, literal pass over `{{key}}` tokens. Template text
 * is never evaluated or interpreted as HTML, and values are inserted as plain
 * text (React escapes them when rendered). A placeholder that cannot be
 * resolved is left visible instead of being replaced by an empty string.
 */

export const TEMPLATE_PLACEHOLDERS = [
  {
    key: "business_name",
    token: "{{business_name}}",
    label: "Business name",
    description: "Name of the saved business.",
  },
  {
    key: "your_name",
    token: "{{your_name}}",
    label: "Your name",
    description: "Your name from your account, when available.",
  },
] as const;

export type PlaceholderKey = (typeof TEMPLATE_PLACEHOLDERS)[number]["key"];

export type PlaceholderValues = Partial<
  Record<PlaceholderKey, string | null | undefined>
>;

export type TemplateSegment =
  | { type: "text"; text: string }
  | { type: "resolved"; key: PlaceholderKey; text: string }
  | { type: "missing"; key: PlaceholderKey; token: string }
  | { type: "unknown"; token: string };

export type RenderedTemplate = {
  text: string;
  /** Known placeholders that had no usable value (unique, in order). */
  missing: PlaceholderKey[];
  /** Tokens that are not supported placeholders (unique, in order). */
  unknown: string[];
};

// A new RegExp per call avoids shared `lastIndex` state between callers.
function tokenPattern(): RegExp {
  return /\{\{\s*([^{}]*?)\s*\}\}/g;
}

export function isPlaceholderKey(value: string): value is PlaceholderKey {
  return TEMPLATE_PLACEHOLDERS.some((placeholder) => placeholder.key === value);
}

function cleanValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned === "" ? null : cleaned;
}

/** Splits a template into text, resolved, missing and unknown segments. */
export function splitTemplate(
  template: string,
  values: PlaceholderValues = {},
): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let cursor = 0;

  for (const match of template.matchAll(tokenPattern())) {
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ type: "text", text: template.slice(cursor, index) });
    }

    const key = match[1].trim().toLowerCase();

    if (!isPlaceholderKey(key)) {
      segments.push({ type: "unknown", token: match[0] });
    } else {
      const value = cleanValue(values[key]);

      segments.push(
        value
          ? { type: "resolved", key, text: value }
          : { type: "missing", key, token: `{{${key}}}` },
      );
    }

    cursor = index + match[0].length;
  }

  if (cursor < template.length) {
    segments.push({ type: "text", text: template.slice(cursor) });
  }

  return segments;
}

/** Produces the final text. Unresolved placeholders stay as visible tokens. */
export function renderTemplate(
  template: string,
  values: PlaceholderValues = {},
): RenderedTemplate {
  const missing: PlaceholderKey[] = [];
  const unknown: string[] = [];
  let text = "";

  for (const segment of splitTemplate(template, values)) {
    switch (segment.type) {
      case "text":
      case "resolved":
        text += segment.text;
        break;
      case "missing":
        text += segment.token;
        if (!missing.includes(segment.key)) missing.push(segment.key);
        break;
      case "unknown":
        text += segment.token;
        if (!unknown.includes(segment.token)) unknown.push(segment.token);
        break;
    }
  }

  return { text, missing, unknown };
}

/** Tokens in `text` that are not supported placeholders. */
export function findUnknownPlaceholders(text: string): string[] {
  const unknown: string[] = [];

  for (const match of text.matchAll(tokenPattern())) {
    const key = match[1].trim().toLowerCase();

    if (!isPlaceholderKey(key) && !unknown.includes(match[0])) {
      unknown.push(match[0]);
    }
  }

  return unknown;
}

/** Every `{{...}}` token still present, used to warn before copying. */
export function listPlaceholderTokens(text: string): string[] {
  const tokens: string[] = [];

  for (const match of text.matchAll(tokenPattern())) {
    if (!tokens.includes(match[0])) tokens.push(match[0]);
  }

  return tokens;
}