import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decodeSearchCursor,
  encodeSearchCursor,
} from "../../lib/overture/cursor.ts";

const RELEASE = "2026-10-21.0";

const cursor = {
  bbox: { minLon: -0.75, minLat: 35.5, maxLon: -0.4, maxLat: 35.9 },
  categories: ["dental_clinic", "general_dentistry"],
  after: "08f2c1b3-4a5d-4e6f-9a0b-1c2d3e4f5a6b",
};

function raw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    v: 1,
    release: RELEASE,
    bbox: [-0.75, 35.5, -0.4, 35.9],
    categories: ["dental_clinic"],
    after: "abc.123:def-456_ghi",
    ...overrides,
  };
}

describe("search cursor", () => {
  test("round-trips a valid cursor", () => {
    const encoded = encodeSearchCursor(RELEASE, cursor);

    assert.deepEqual(decodeSearchCursor(encoded, RELEASE), cursor);
  });

  test("encodes as URL-safe base64 without padding", () => {
    const encoded = encodeSearchCursor(RELEASE, cursor);

    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  });

  test("rejects malformed or non-object payloads", () => {
    assert.equal(decodeSearchCursor("", RELEASE), null);
    assert.equal(decodeSearchCursor("%%%not-base64%%%", RELEASE), null);
    assert.equal(decodeSearchCursor(raw(null), RELEASE), null);
    assert.equal(decodeSearchCursor(raw([1, 2, 3]), RELEASE), null);
    assert.equal(decodeSearchCursor(raw("cursor"), RELEASE), null);
  });

  test("rejects an invalid version or a different release", () => {
    assert.equal(decodeSearchCursor(raw(payload({ v: 2 })), RELEASE), null);
    assert.equal(decodeSearchCursor(raw(payload({ v: "1" })), RELEASE), null);
    assert.equal(
      decodeSearchCursor(raw(payload({ release: "2025-01-01.0" })), RELEASE),
      null,
    );
  });

  test("rejects oversized cursors before parsing", () => {
    assert.equal(decodeSearchCursor("a".repeat(8_193), RELEASE), null);
  });

  test("validates the bbox shape and range", () => {
    const invalidBoxes = [
      [-0.75, 35.5, -0.4],
      [-0.75, 35.5, -0.4, 35.9, 1],
      ["-0.75", 35.5, -0.4, 35.9],
      [-180.1, 35.5, -0.4, 35.9],
      [-0.75, 35.5, 180.1, 35.9],
      [-0.75, -90.1, -0.4, 35.9],
      [-0.75, 35.5, -0.4, 90.1],
      [-0.4, 35.5, -0.75, 35.9],
      [-0.75, 35.9, -0.4, 35.5],
      [-0.4, 35.5, -0.4, 35.9],
      [-0.75, 35.5, -0.4, 35.5],
      [null, 35.5, -0.4, 35.9],
    ];

    for (const bbox of invalidBoxes) {
      assert.equal(decodeSearchCursor(raw(payload({ bbox })), RELEASE), null);
    }
  });

  test("accepts bbox boundary values", () => {
    const decoded = decodeSearchCursor(
      raw(payload({ bbox: [-180, -90, 180, 90] })),
      RELEASE,
    );

    assert.deepEqual(decoded?.bbox, {
      minLon: -180,
      minLat: -90,
      maxLon: 180,
      maxLat: 90,
    });
  });

  test("validates categories", () => {
    const invalidCategories = [
      [],
      "dental_clinic",
      ["dental clinic"],
      ["dental-clinic"],
      [""],
      ["a".repeat(101)],
      [1],
      Array.from({ length: 33 }, (_, index) => `category_${index}`),
    ];

    for (const categories of invalidCategories) {
      assert.equal(
        decodeSearchCursor(raw(payload({ categories })), RELEASE),
        null,
      );
    }
  });

  test("accepts up to 32 safe category names", () => {
    const categories = Array.from({ length: 32 }, (_, index) => `category_${index}`);
    const decoded = decodeSearchCursor(
      raw(payload({ categories })),
      RELEASE,
    );

    assert.deepEqual(decoded?.categories, categories);
  });

  test("validates the keyset id", () => {
    const invalidAfter = [
      "",
      "has space",
      "semi;colon",
      "slash/value",
      "quote'value",
      "a".repeat(201),
      123,
      null,
    ];

    for (const after of invalidAfter) {
      assert.equal(decodeSearchCursor(raw(payload({ after })), RELEASE), null);
    }
  });

  test("returns only the validated cursor fields", () => {
    const decoded = decodeSearchCursor(
      raw(payload({ extra: "ignored" })),
      RELEASE,
    );

    assert.deepEqual(Object.keys(decoded ?? {}).sort(), [
      "after",
      "bbox",
      "categories",
    ]);
  });
});
