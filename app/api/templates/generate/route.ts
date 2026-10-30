import { NextResponse } from "next/server";

import {
  generateTemplateDraft,
  isTemplateGenerationConfigured,
  TemplateGenerationError,
} from "@/features/templates/ai-generation";
import { validateTemplateGenerationInput } from "@/features/templates/generation";
import { consumeTemplateGenerationQuota } from "@/features/templates/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";

function errorResponse(message: string, status: number, code: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse(
      "Sign in to generate a template.",
      401,
      "UNAUTHENTICATED",
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      "Send valid generation details.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const validated = validateTemplateGenerationInput(payload);
  if (!validated.ok) {
    return errorResponse(validated.message, 400, "VALIDATION_ERROR");
  }

  if (!isTemplateGenerationConfigured()) {
    return errorResponse(
      "AI generation is not configured. Add GROQ_API_KEY to the server environment.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }

  let quota: ReturnType<typeof consumeTemplateGenerationQuota>;
  try {
    quota = consumeTemplateGenerationQuota(user.id);
  } catch (error) {
    console.error("Template AI rate limit: unexpected in-memory failure", error);
    return errorResponse(
      "Could not check your AI usage. Please try again.",
      503,
      "RATE_LIMIT_UNAVAILABLE",
    );
  }
  if (!quota.ok) {
    return errorResponse(
      quota.message,
      quota.kind === "limit" ? 429 : 503,
      quota.kind === "limit" ? "DAILY_LIMIT_REACHED" : "RATE_LIMIT_UNAVAILABLE",
    );
  }

  try {
    const draft = await generateTemplateDraft(validated.value);
    return NextResponse.json(
      { draft },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof TemplateGenerationError) {
      const status =
        error.kind === "not_configured"
          ? 503
          : error.kind === "timeout"
            ? 504
            : 502;
      const code =
        error.kind === "not_configured"
          ? "AI_NOT_CONFIGURED"
          : error.kind === "timeout"
            ? "AI_TIMEOUT"
            : error.kind === "invalid_response"
              ? "AI_INVALID_RESPONSE"
              : "AI_PROVIDER_FAILED";

      return errorResponse(error.message, status, code);
    }

    console.error("Template AI generation failed unexpectedly", error);
    return errorResponse(
      "Your draft could not be generated. Please try again.",
      502,
      "AI_PROVIDER_FAILED",
    );
  }
}
