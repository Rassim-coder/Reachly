import "server-only";

import {
  parseTemplateDraft,
  type TemplateDraft,
  type TemplateGenerationInput,
} from "./generation";
import {
  buildTemplateGenerationPrompt,
  TEMPLATE_GENERATION_SYSTEM_PROMPT,
} from "./generation-prompt";

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const GENERATION_TIMEOUT_MS = 12_000;

export type TemplateGenerationErrorKind =
  | "not_configured"
  | "timeout"
  | "provider"
  | "invalid_response";

export class TemplateGenerationError extends Error {
  constructor(
    public readonly kind: TemplateGenerationErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "TemplateGenerationError";
  }
}

export function isTemplateGenerationConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function generateTemplateDraft(
  input: TemplateGenerationInput,
): Promise<TemplateDraft> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new TemplateGenerationError(
      "not_configured",
      "AI generation is not configured. Add GROQ_API_KEY to the server environment.",
    );
  }

  let response: Response;
  try {
    response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
        temperature: 0.6,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: TEMPLATE_GENERATION_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildTemplateGenerationPrompt(input),
          },
        ],
      }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new TemplateGenerationError(
        "timeout",
        "Writing your draft took too long. Please try again.",
      );
    }
    throw new TemplateGenerationError(
      "provider",
      "The AI service could not be reached. Please try again.",
    );
  }

  if (!response.ok) {
    console.error("Template AI provider request failed", response.status);
    throw new TemplateGenerationError(
      "provider",
      "The AI service could not complete this request. Please try again.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TemplateGenerationError(
      "invalid_response",
      "The AI service returned an invalid response. Please try again.",
    );
  }

  const content =
    typeof payload === "object" &&
    payload !== null &&
    "choices" in payload &&
    Array.isArray(payload.choices) &&
    typeof payload.choices[0] === "object" &&
    payload.choices[0] !== null &&
    "message" in payload.choices[0] &&
    typeof payload.choices[0].message === "object" &&
    payload.choices[0].message !== null &&
    "content" in payload.choices[0].message
      ? payload.choices[0].message.content
      : null;
  const draft = parseTemplateDraft(content, input.channel);

  if (!draft) {
    throw new TemplateGenerationError(
      "invalid_response",
      "The AI returned a draft in an unexpected format. Please try again.",
    );
  }

  return draft;
}
