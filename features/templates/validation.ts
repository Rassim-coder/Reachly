import { findUnknownPlaceholders } from "./placeholders.ts";
import {
  TEMPLATE_CHANNELS,
  type TemplateChannel,
} from "./Types.ts";

/**
 * Pure validation for message templates. The server actions authenticate the
 * user and perform all writes; nothing here does I/O.
 */

export const MAX_TEMPLATE_NAME_LENGTH = 80;
export const MAX_TEMPLATE_SUBJECT_LENGTH = 150;
export const MAX_TEMPLATE_BODY_LENGTH = 3000;

export type CleanTemplate = {
  name: string;
  channel: TemplateChannel;
  subject: string | null;
  body: string;
};

export type CleanTemplateResult =
  | { ok: true; value: CleanTemplate }
  | { ok: false; message: string };

export function isTemplateChannel(value: unknown): value is TemplateChannel {
  return (
    typeof value === "string" &&
    (TEMPLATE_CHANNELS as readonly string[]).includes(value)
  );
}

export function isValidTemplateId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function fail(message: string): CleanTemplateResult {
  return { ok: false, message };
}

/** Re-validates an untrusted template payload before it reaches the database. */
export function validateTemplateInput(input: unknown): CleanTemplateResult {
  if (typeof input !== "object" || input === null) {
    return fail("The template details are invalid.");
  }

  const candidate = input as Record<string, unknown>;

  const name =
    typeof candidate.name === "string"
      ? candidate.name.trim().replace(/\s+/g, " ")
      : "";

  if (name === "") return fail("Enter a template name.");

  if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
    return fail(
      `Template names cannot be longer than ${MAX_TEMPLATE_NAME_LENGTH} characters.`,
    );
  }

  const channel = candidate.channel;

  if (!isTemplateChannel(channel)) return fail("Choose Email or WhatsApp.");

  const body =
    typeof candidate.body === "string"
      ? candidate.body.replace(/\r\n/g, "\n").trim()
      : "";

  if (body === "") return fail("Write a message before saving.");

  if (body.length > MAX_TEMPLATE_BODY_LENGTH) {
    return fail(
      `Messages cannot be longer than ${MAX_TEMPLATE_BODY_LENGTH} characters.`,
    );
  }

  let subject: string | null = null;

  if (channel === "email") {
    // Collapsing whitespace also removes line breaks, which a subject cannot hold.
    const cleanedSubject =
      typeof candidate.subject === "string"
        ? candidate.subject.trim().replace(/\s+/g, " ")
        : "";

    if (cleanedSubject === "") return fail("Add a subject for email templates.");

    if (cleanedSubject.length > MAX_TEMPLATE_SUBJECT_LENGTH) {
      return fail(
        `Subjects cannot be longer than ${MAX_TEMPLATE_SUBJECT_LENGTH} characters.`,
      );
    }

    subject = cleanedSubject;
  }

  const unknown = findUnknownPlaceholders(`${subject ?? ""}\n${body}`);

  if (unknown.length > 0) {
    return fail(
      `${unknown[0]} is not a supported placeholder. Use the placeholder buttons to insert one.`,
    );
  }

  return { ok: true, value: { name, channel, subject, body } };
}

/** Picks a free "(copy)" name for a duplicated template, within the length limit. */
export function duplicateTemplateName(
  name: string,
  existingNames: readonly string[],
): string {
  const taken = new Set(existingNames.map((value) => value.trim().toLowerCase()));

  for (let attempt = 1; attempt < 1000; attempt += 1) {
    const suffix = attempt === 1 ? " (copy)" : ` (copy ${attempt})`;
    const candidate = `${name.slice(0, MAX_TEMPLATE_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`;

    if (!taken.has(candidate.toLowerCase())) return candidate;
  }

  return `${name.slice(0, MAX_TEMPLATE_NAME_LENGTH - 8).trimEnd()} (copy)`;
}