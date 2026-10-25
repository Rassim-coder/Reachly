import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  parseSaveLeadsRpcResult,
  singleSaveMessage,
  toBulkSaveResult,
} from "../../features/leads/save-result.ts";

describe("lead-saving RPC result parsing", () => {
  test("accepts a consistent successful result", () => {
    assert.deepEqual(
      parseSaveLeadsRpcResult({
        ok: true,
        added: 2,
        existing: 1,
        failed: 1,
        total: 4,
      }),
      { added: 2, existing: 1, failed: 1, total: 4 },
    );
  });

  test("accepts a valid all-zero result", () => {
    assert.deepEqual(
      parseSaveLeadsRpcResult({
        ok: true,
        added: 0,
        existing: 0,
        failed: 0,
        total: 0,
      }),
      { added: 0, existing: 0, failed: 0, total: 0 },
    );
  });

  test("rejects unsuccessful, malformed, and inconsistent results", () => {
    const invalid = [
      null,
      undefined,
      "saved",
      [],
      { ok: false, added: 0, existing: 0, failed: 0, total: 0 },
      { ok: true, added: 1, existing: 0, failed: 0, total: 2 },
      { ok: true, added: -1, existing: 1, failed: 0, total: 0 },
      { ok: true, added: 1.5, existing: 0, failed: 0, total: 1.5 },
      { ok: true, added: "1", existing: 0, failed: 0, total: 1 },
    ];

    for (const value of invalid) {
      assert.equal(parseSaveLeadsRpcResult(value), null);
    }
  });
});

describe("lead-saving result messages", () => {
  test("reports a new save", () => {
    assert.deepEqual(
      singleSaveMessage({ added: 1, existing: 0, failed: 0, total: 1 }),
      { ok: true, message: "Saved to your leads." },
    );
  });

  test("reports an existing lead without treating it as a failure", () => {
    assert.deepEqual(
      singleSaveMessage({ added: 0, existing: 1, failed: 0, total: 1 }),
      { ok: true, message: "This business is already in your leads." },
    );
  });

  test("reports a failed single save", () => {
    assert.deepEqual(
      singleSaveMessage({ added: 0, existing: 0, failed: 1, total: 1 }),
      { ok: false, message: "Could not save this lead. Please try again." },
    );
  });

  test("preserves bulk partial-success counts", () => {
    assert.deepEqual(
      toBulkSaveResult({ added: 3, existing: 2, failed: 1, total: 6 }),
      { ok: true, added: 3, existing: 2, failed: 1, total: 6 },
    );
  });
});
