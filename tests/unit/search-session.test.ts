import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DEFAULT_SEARCH_FILTERS,
  MAX_PERSISTED_RESULTS,
  SEARCH_SESSION_STORAGE_KEY,
  SEARCH_SESSION_TTL_MS,
  buildSearchSession,
  clearSearchSession,
  readSearchSession,
  writeSearchSession,
  type SearchSessionInput,
  type SearchSessionStorage,
} from "../../features/businesses/search-session.ts";
import type { NormalizedBusiness } from "../../types/api.ts";

function business(
  sourceId: string,
  overrides: Partial<NormalizedBusiness> = {},
): NormalizedBusiness {
  return {
    sourceId,
    name: sourceId.toUpperCase(),
    category: "dentist",
    address: "1 Test Street",
    latitude: 35.7,
    longitude: -0.6,
    phone: "123",
    website: "https://example.com",
    email: "hello@example.com",
    ...overrides,
  };
}

function memoryStorage(initial: Record<string, string> = {}): {
  data: Map<string, string>;
  storage: SearchSessionStorage;
} {
  const data = new Map(Object.entries(initial));

  return {
    data,
    storage: {
      getItem(key) {
        return data.get(key) ?? null;
      },
      setItem(key, value) {
        data.set(key, value);
      },
      removeItem(key) {
        data.delete(key);
      },
    },
  };
}

function input(overrides: Partial<SearchSessionInput> = {}): SearchSessionInput {
  return {
    query: { niche: "  dentists  ", location: " Paris, France " },
    results: [
      business("a"),
      business("b", { phone: null, website: null }),
    ],
    nextCursor: "cursor-page-2",
    firstElapsedMs: 1_234.6,
    filters: { website: "has", phone: "all", email: "none" },
    selectedIds: ["b", "missing", "b"],
    ...overrides,
  };
}

describe("Find Businesses search persistence", () => {
  test("round-trips results, criteria, filters, pagination, and valid selection", () => {
    const now = 1_700_000_000_000;
    const { storage } = memoryStorage();

    assert.equal(writeSearchSession(storage, input(), now), true);

    const restored = readSearchSession(storage, now + 5_000);
    assert.ok(restored);
    assert.equal(restored.savedAt, now);
    assert.deepEqual(restored.query, {
      niche: "dentists",
      location: "Paris, France",
    });
    assert.deepEqual(
      restored.results?.map((row) => row.sourceId),
      ["a", "b"],
    );
    assert.equal(restored.nextCursor, "cursor-page-2");
    assert.equal(restored.firstElapsedMs, 1_235);
    assert.deepEqual(restored.filters, {
      website: "has",
      phone: "all",
      email: "none",
    });
    assert.deepEqual(restored.selectedIds, ["b"]);
  });

  test("does not restore stale or duplicate selected ids", () => {
    const { storage } = memoryStorage();
    const saved = buildSearchSession(
      input({ selectedIds: ["a", "missing", "a", "b"] }),
      1_700_000_000_000,
    );

    assert.deepEqual(saved.selectedIds, ["a", "b"]);

    writeSearchSession(
      storage,
      input({ selectedIds: ["missing", "a", "a"] }),
      1_700_000_000_000,
    );
    const restored = readSearchSession(storage, 1_700_000_000_000);

    assert.ok(restored);
    assert.deepEqual(restored.selectedIds, ["a"]);
  });

  test("rejects malformed, mismatched, and expired snapshots", () => {
    const invalidRaw = memoryStorage({
      [SEARCH_SESSION_STORAGE_KEY]: "{not-json",
    });
    assert.equal(readSearchSession(invalidRaw.storage), null);
    assert.equal(invalidRaw.data.has(SEARCH_SESSION_STORAGE_KEY), false);

    const now = 1_700_000_000_000;
    const wrongVersion = memoryStorage({
      [SEARCH_SESSION_STORAGE_KEY]: JSON.stringify({
        ...buildSearchSession(input(), now),
        version: 999,
      }),
    });
    assert.equal(readSearchSession(wrongVersion.storage, now), null);
    assert.equal(wrongVersion.data.has(SEARCH_SESSION_STORAGE_KEY), false);

    const malformedResult = JSON.parse(
      JSON.stringify(buildSearchSession(input(), now)),
    ) as Record<string, unknown>;
    const results = malformedResult.results as Array<Record<string, unknown>>;
    results[0].name = 42;
    const malformed = memoryStorage({
      [SEARCH_SESSION_STORAGE_KEY]: JSON.stringify(malformedResult),
    });
    assert.equal(readSearchSession(malformed.storage, now), null);

    const expired = memoryStorage();
    writeSearchSession(expired.storage, input(), now);
    assert.equal(
      readSearchSession(expired.storage, now + SEARCH_SESSION_TTL_MS + 1),
      null,
    );
    assert.equal(expired.data.has(SEARCH_SESSION_STORAGE_KEY), false);
  });

  test("stores criteria only when the result set is too large", () => {
    const results = Array.from(
      { length: MAX_PERSISTED_RESULTS + 1 },
      (_, index) => business(`large-${index}`),
    );
    const { storage } = memoryStorage();

    assert.equal(
      writeSearchSession(
        storage,
        input({ results, selectedIds: ["large-0"] }),
        1_700_000_000_000,
      ),
      true,
    );

    const restored = readSearchSession(storage, 1_700_000_000_000);
    assert.ok(restored);
    assert.equal(restored.results, null);
    assert.equal(restored.nextCursor, null);
    assert.equal(restored.firstElapsedMs, null);
    assert.deepEqual(restored.selectedIds, []);
    assert.deepEqual(restored.query, {
      niche: "dentists",
      location: "Paris, France",
    });
    assert.deepEqual(restored.filters, input().filters);
  });

  test("removes an older snapshot when the new snapshot cannot be written", () => {
    const underlying = memoryStorage({
      [SEARCH_SESSION_STORAGE_KEY]: "older-snapshot",
    });
    const storage: SearchSessionStorage = {
      getItem: underlying.storage.getItem,
      setItem() {
        throw new Error("Storage disabled");
      },
      removeItem: underlying.storage.removeItem,
    };

    assert.equal(
      writeSearchSession(storage, input(), 1_700_000_000_000),
      false,
    );
    assert.equal(underlying.data.has(SEARCH_SESSION_STORAGE_KEY), false);
  });

  test("rejects an oversized snapshot that was put into storage directly", () => {
    const now = 1_700_000_000_000;
    const snapshot = JSON.parse(
      JSON.stringify(buildSearchSession(input(), now)),
    ) as Record<string, unknown>;
    snapshot.results = Array.from(
      { length: MAX_PERSISTED_RESULTS + 1 },
      (_, index) => business(`stored-${index}`),
    );
    const { data, storage } = memoryStorage({
      [SEARCH_SESSION_STORAGE_KEY]: JSON.stringify(snapshot),
    });

    assert.equal(readSearchSession(storage, now), null);
    assert.equal(data.has(SEARCH_SESSION_STORAGE_KEY), false);
  });

  test("falls back to criteria without throwing when storage quota is exceeded", () => {
    const underlying = memoryStorage();
    let attempts = 0;
    const storage: SearchSessionStorage = {
      getItem: underlying.storage.getItem,
      setItem(key, value) {
        attempts += 1;
        if (attempts === 1) throw new Error("QuotaExceededError");
        underlying.storage.setItem(key, value);
      },
      removeItem: underlying.storage.removeItem,
    };

    assert.equal(
      writeSearchSession(storage, input(), 1_700_000_000_000),
      true,
    );
    assert.equal(attempts, 2);

    const restored = readSearchSession(underlying.storage, 1_700_000_000_000);
    assert.ok(restored);
    assert.equal(restored.results, null);
  });

  test("clearing results removes only the temporary search key", () => {
    const unrelatedKey = "reachly:leads:saved";
    const { data, storage } = memoryStorage({ [unrelatedKey]: "lead-1" });

    writeSearchSession(storage, input(), 1_700_000_000_000);
    assert.equal(data.has(SEARCH_SESSION_STORAGE_KEY), true);

    clearSearchSession(storage);

    assert.equal(data.has(SEARCH_SESSION_STORAGE_KEY), false);
    assert.equal(data.get(unrelatedKey), "lead-1");
  });

  test("an empty successful result set remains restorable", () => {
    const { storage } = memoryStorage();
    writeSearchSession(
      storage,
      input({
        results: [],
        nextCursor: null,
        selectedIds: [],
        filters: { ...DEFAULT_SEARCH_FILTERS },
      }),
      1_700_000_000_000,
    );

    const restored = readSearchSession(storage, 1_700_000_000_000);
    assert.ok(restored);
    assert.deepEqual(restored.results, []);
    assert.equal(restored.nextCursor, null);
    assert.deepEqual(restored.filters, DEFAULT_SEARCH_FILTERS);
  });
});
