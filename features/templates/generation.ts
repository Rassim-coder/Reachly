import {
  MAX_TEMPLATE_BODY_LENGTH,
  MAX_TEMPLATE_SUBJECT_LENGTH,
} from "./validation.ts";
import { findUnknownPlaceholders } from "./placeholders.ts";
import type { TemplateChannel } from "./Types.ts";

export const TEMPLATE_GOALS = [
  "introduce",
  "offer_service",
  "follow_up",
  "meeting",
  "reengage",
] as const;

export const TEMPLATE_TONES = [
  "professional",
  "friendly",
  "short_direct",
] as const;

export const TEMPLATE_LANGUAGES = ["en", "fr"] as const;

export type TemplateGoal = (typeof TEMPLATE_GOALS)[number];
export type TemplateTone = (typeof TEMPLATE_TONES)[number];
export type TemplateLanguage = (typeof TEMPLATE_LANGUAGES)[number];

export type TemplateGenerationInput = {
  channel: TemplateChannel;
  goal: TemplateGoal;
  tone: TemplateTone;
  language: TemplateLanguage;
  offer: string;
  instructions: string;
};

export type TemplateDraft = {
  subject: string | null;
  body: string;
};

export type ValidationResult =
  | { ok: true; value: TemplateGenerationInput }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function includesValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function validateTemplateGenerationInput(
  input: unknown,
): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "Enter valid generation details." };
  }
  const allowedFields = new Set([
    "channel",
    "goal",
    "tone",
    "language",
    "offer",
    "instructions",
  ]);
  if (Object.keys(input).some((key) => !allowedFields.has(key))) {
    return { ok: false, message: "Remove unsupported generation details." };
  }

  if (input.channel !== "email" && input.channel !== "whatsapp") {
    return { ok: false, message: "Choose Email or WhatsApp." };
  }
  if (!includesValue(TEMPLATE_GOALS, input.goal)) {
    return { ok: false, message: "Choose a valid message goal." };
  }
  if (!includesValue(TEMPLATE_TONES, input.tone)) {
    return { ok: false, message: "Choose a valid tone." };
  }
  if (!includesValue(TEMPLATE_LANGUAGES, input.language)) {
    return { ok: false, message: "Choose English or French." };
  }

  const offer = typeof input.offer === "string" ? input.offer.trim() : "";
  if (offer === "") {
    return { ok: false, message: "Describe what you offer." };
  }
  if (offer.length > 200) {
    return { ok: false, message: "What you offer must be 200 characters or fewer." };
  }

  if (
    input.instructions !== undefined &&
    typeof input.instructions !== "string"
  ) {
    return { ok: false, message: "Extra instructions must be text." };
  }
  const instructions =
    typeof input.instructions === "string" ? input.instructions.trim() : "";
  if (instructions.length > 300) {
    return {
      ok: false,
      message: "Extra instructions must be 300 characters or fewer.",
    };
  }

  return {
    ok: true,
    value: {
      channel: input.channel,
      goal: input.goal,
      tone: input.tone,
      language: input.language,
      offer,
      instructions,
    },
  };
}

function cleanJsonText(value: string): string {
  const trimmed = value.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  return firstBrace >= 0 && lastBrace > firstBrace
    ? trimmed.slice(firstBrace, lastBrace + 1)
    : trimmed;
}

export function parseTemplateDraft(
  value: unknown,
  channel: TemplateChannel,
): TemplateDraft | null {
  if (typeof value !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJsonText(value));
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (
    Object.keys(parsed).length !== 2 ||
    !Object.hasOwn(parsed, "subject") ||
    !Object.hasOwn(parsed, "body")
  ) {
    return null;
  }

  const body =
    typeof parsed.body === "string"
      ? parsed.body.trim().replace(/\r\n/g, "\n")
      : "";
  if (body === "" || body.length > MAX_TEMPLATE_BODY_LENGTH) return null;

  let subject: string | null = null;
  if (channel === "email") {
    if (typeof parsed.subject !== "string") return null;
    subject = parsed.subject.trim().replace(/\s+/g, " ");
    if (subject === "" || subject.length > MAX_TEMPLATE_SUBJECT_LENGTH) {
      return null;
    }
  } else if (parsed.subject !== null) {
    return null;
  }

  if (findUnknownPlaceholders(`${subject ?? ""}\n${body}`).length > 0) {
    return null;
  }

  return { subject, body };
}
