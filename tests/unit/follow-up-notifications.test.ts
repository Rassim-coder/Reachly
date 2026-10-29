import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getFollowUpsDueTodayMessage } from "../../features/follow-ups/notifications.ts";

describe("follow-up due-today notification copy", () => {
  test("does not claim work is due when the count is zero", () => {
    assert.equal(getFollowUpsDueTodayMessage(0), "No follow-ups due today.");
  });

  test("uses singular wording for one due follow-up", () => {
    assert.equal(getFollowUpsDueTodayMessage(1), "You have 1 follow-up due today.");
  });

  test("uses plural wording for multiple due follow-ups", () => {
    assert.equal(getFollowUpsDueTodayMessage(3), "You have 3 follow-ups due today.");
  });
});
