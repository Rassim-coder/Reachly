import type { TemplateChannel } from "./Types.ts";

/**
 * `message_templates` has no `subject` column (only name, channel, body), and
 * this MVP must not change the schema. An email subject is therefore stored as
 * the first line of `body`:
 *
 *   Subject: <subject>
 *
 *   <message>
 *
 * Rows without that first line (older data, WhatsApp) decode with no subject.
 * Pure module, no I/O.
 */

const SUBJECT_LINE = /^Subject:[ \t]*([^\r\n]*)(?:\r?\n)*/;

export function encodeTemplateContent(content: {
  channel: TemplateChannel;
  subject: string | null;
  body: string;
}): string {
  if (content.channel !== "email" || !content.subject) return content.body;

  return `Subject: ${content.subject}\n\n${content.body}`;
}

export function decodeTemplateContent(
  channel: TemplateChannel,
  stored: string,
): { subject: string | null; body: string } {
  if (channel !== "email") return { subject: null, body: stored };

  const match = SUBJECT_LINE.exec(stored);
  if (!match) return { subject: null, body: stored };

  return {
    subject: match[1].trim() || null,
    body: stored.slice(match[0].length).trim(),
  };
}