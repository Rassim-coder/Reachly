import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { runFollowUpCompletion } from "../../features/leads/follow-up-completion.ts";

describe("follow-up completion workflow", () => {
  test("clears, revalidates, and records one completion event", async () => {
    const calls: string[] = [];
    const result = await runFollowUpCompletion({
      clear: async () => {
        calls.push("clear");
        return "completed";
      },
      recordCompletion: async () => {
        calls.push("record");
        return true;
      },
      revalidate: () => calls.push("revalidate"),
    });

    assert.deepEqual(calls, ["clear", "revalidate", "record"]);
    assert.deepEqual(result, { ok: true, message: "Follow-up completed." });
  });

  test("does not report completion or record activity when clearing fails", async () => {
    const calls: string[] = [];
    const result = await runFollowUpCompletion({
      clear: async () => "failed",
      recordCompletion: async () => {
        calls.push("record");
        return true;
      },
      revalidate: () => calls.push("revalidate"),
    });

    assert.deepEqual(calls, []);
    assert.deepEqual(result, {
      ok: false,
      message: "Could not complete this follow-up. Please try again.",
    });
  });

  test("does not claim completion when the database clear throws", async () => {
    let activityCount = 0;
    const result = await runFollowUpCompletion({
      clear: async () => {
        throw new Error("database unavailable");
      },
      recordCompletion: async () => {
        activityCount += 1;
        return true;
      },
      revalidate: () => assert.fail("must not revalidate a failed clear"),
    });

    assert.equal(result.ok, false);
    assert.equal(activityCount, 0);
  });

  test("reports persisted completion with a warning if history insertion fails", async () => {
    const calls: string[] = [];
    const result = await runFollowUpCompletion({
      clear: async () => "completed",
      recordCompletion: async () => false,
      revalidate: () => calls.push("revalidate"),
    });

    assert.deepEqual(calls, ["revalidate"]);
    assert.deepEqual(result, {
      ok: true,
      message: "Follow-up completed. The activity history could not be recorded.",
    });
  });

  test("catches thrown activity failures after revalidation", async () => {
    const calls: string[] = [];
    const result = await runFollowUpCompletion({
      clear: async () => "completed",
      recordCompletion: async () => {
        throw new Error("network failure");
      },
      revalidate: () => calls.push("revalidate"),
    });

    assert.deepEqual(calls, ["revalidate"]);
    assert.equal(result.ok, true);
    assert.match(result.message, /activity history could not be recorded/);
  });

  test("makes a repeated completion idempotent without another event", async () => {
    let activityCount = 0;
    let refreshCount = 0;
    const result = await runFollowUpCompletion({
      clear: async () => "already_cleared",
      recordCompletion: async () => {
        activityCount += 1;
        return true;
      },
      revalidate: () => {
        refreshCount += 1;
      },
    });

    assert.equal(result.ok, true);
    assert.equal(activityCount, 0);
    assert.equal(refreshCount, 1);
  });

  test("does not complete a rescheduled or unowned lead", async () => {
    for (const state of ["rescheduled", "not_found"] as const) {
      let activityCount = 0;
      const result = await runFollowUpCompletion({
        clear: async () => state,
        recordCompletion: async () => {
          activityCount += 1;
          return true;
        },
        revalidate: () => undefined,
      });

      assert.equal(result.ok, false);
      assert.equal(activityCount, 0);
    }
  });
});
