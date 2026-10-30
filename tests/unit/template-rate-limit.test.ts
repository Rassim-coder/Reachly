import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import {
  consumeTemplateGenerationQuota,
  getTemplateGenerationDailyLimit,
} from "../../features/templates/rate-limit.ts";

test("limits each user per UTC day and resets on the next day", () => {
  const userId = randomUUID();
  const dailyLimit = getTemplateGenerationDailyLimit();
  assert.ok(dailyLimit !== null);

  const today = new Date("2026-10-30T12:00:00.000Z");
  for (let request = 0; request < dailyLimit; request += 1) {
    assert.deepEqual(consumeTemplateGenerationQuota(userId, today), {
      ok: true,
    });
  }

  assert.deepEqual(consumeTemplateGenerationQuota(userId, today), {
    ok: false,
    kind: "limit",
    message: `Daily AI limit reached (${dailyLimit} generations). Try again tomorrow.`,
  });
  assert.deepEqual(
    consumeTemplateGenerationQuota(
      userId,
      new Date("2026-10-31T00:00:00.000Z"),
    ),
    { ok: true },
  );
});
