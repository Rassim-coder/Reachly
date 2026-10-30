const DEFAULT_DAILY_LIMIT = 20;
const MAX_DAILY_LIMIT = 100;
const usageByUser = new Map<string, { usageDate: string; count: number }>();
let requestsSinceCleanup = 0;

export type TemplateGenerationQuota =
  | { ok: true }
  | {
      ok: false;
      kind: "limit" | "configuration";
      message: string;
    };

export function getTemplateGenerationDailyLimit(): number | null {
  const configured = process.env.TEMPLATE_AI_DAILY_LIMIT;
  if (configured === undefined || configured.trim() === "") {
    return DEFAULT_DAILY_LIMIT;
  }

  const limit = Number(configured);
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_DAILY_LIMIT
    ? limit
    : null;
}

export function consumeTemplateGenerationQuota(
  userId: string,
  now = new Date(),
): TemplateGenerationQuota {
  const dailyLimit = getTemplateGenerationDailyLimit();
  if (dailyLimit === null) {
    return {
      ok: false,
      kind: "configuration",
      message:
        "AI generation is temporarily unavailable because its daily limit is misconfigured.",
    };
  }

  const usageDate = now.toISOString().slice(0, 10);
  const current = usageByUser.get(userId);
  const usage =
    current?.usageDate === usageDate
      ? current
      : { usageDate, count: 0 };

  if (usage.count >= dailyLimit) {
    return {
      ok: false,
      kind: "limit",
      message: `Daily AI limit reached (${dailyLimit} generations). Try again tomorrow.`,
    };
  }

  usage.count += 1;
  usageByUser.set(userId, usage);

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 256) {
    for (const [id, entry] of usageByUser) {
      if (entry.usageDate !== usageDate) usageByUser.delete(id);
    }
    requestsSinceCleanup = 0;
  }

  return { ok: true };
}
