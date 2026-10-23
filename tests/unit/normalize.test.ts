import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  normalizeBusiness,
  normalizeBusinesses,
} from "../../lib/overture/normalize.ts";
import type { PlaceRow } from "../../lib/overture/query.ts";

function row(overrides: Partial<PlaceRow> = {}): PlaceRow {
  return {
    id: "08f2c1b3-4a5d-4e6f-9a0b-1c2d3e4f5a6b",
    name: "  Clinique Dentaire  ",
    category: " dental_clinic ",
    address: "  12 Rue Didouche Mourad  ",
    phone: " +213 555 01 02 ",
    website: " https://example.dz ",
    email: " contact@example.dz ",
    lon: 3.0588,
    lat: 36.7538,
    ...overrides,
  };
}

describe("Overture normalization", () => {
  test("maps a complete place and trims strings", () => {
    assert.deepEqual(normalizeBusiness(row()), {
      sourceId: "08f2c1b3-4a5d-4e6f-9a0b-1c2d3e4f5a6b",
      name: "Clinique Dentaire",
      category: "dental_clinic",
      address: "12 Rue Didouche Mourad",
      latitude: 36.7538,
      longitude: 3.0588,
      phone: "+213 555 01 02",
      website: "https://example.dz",
      email: "contact@example.dz",
    });
  });

  test("keeps optional values null instead of fabricating them", () => {
    const normalized = normalizeBusiness(
      row({
        category: "",
        address: null,
        phone: null,
        website: "   ",
        email: null,
        lon: null,
        lat: null,
      }),
    );

    assert.equal(normalized?.category, null);
    assert.equal(normalized?.address, null);
    assert.equal(normalized?.phone, null);
    assert.equal(normalized?.website, null);
    assert.equal(normalized?.email, null);
    assert.equal(normalized?.longitude, null);
    assert.equal(normalized?.latitude, null);
  });

  test("preserves zero and negative coordinates", () => {
    const normalized = normalizeBusiness(row({ lat: 0, lon: -17.445 }));

    assert.equal(normalized?.latitude, 0);
    assert.equal(normalized?.longitude, -17.445);
  });

  test("drops non-finite coordinates", () => {
    const normalized = normalizeBusiness(
      row({ lat: Number.NaN, lon: Number.POSITIVE_INFINITY }),
    );

    assert.equal(normalized?.latitude, null);
    assert.equal(normalized?.longitude, null);
  });

  test("rejects missing, blank, or whitespace-only names and ids", () => {
    for (const name of [null, "", "   ", "\t\n"]) {
      assert.equal(normalizeBusiness(row({ name })), null);
    }

    assert.equal(normalizeBusiness(row({ id: "" })), null);
  });

  test("normalizes a result set in order and drops invalid records", () => {
    const normalized = normalizeBusinesses([
      row({ id: "a", name: "A" }),
      row({ id: "b", name: "   " }),
      row({ id: "c", name: "C" }),
    ]);

    assert.deepEqual(
      normalized.map((business) => business.sourceId),
      ["a", "c"],
    );
  });
});
