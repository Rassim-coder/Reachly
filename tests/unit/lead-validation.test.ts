import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  MAX_NAME_LENGTH,
  MAX_SOURCE_ID_LENGTH,
  MAX_TEXT_LENGTH,
  collectBusinessesForBulkSave,
  toBusinessRow,
  validateBusinessInput,
  type CleanBusiness,
} from "../../features/leads/validation.ts";

const base = {
  sourceId: "08f2c1b3-4a5d-4e6f-9a0b-1c2d3e4f5a6b",
  name: "Clinique Dentaire",
  category: "dental_clinic",
  address: "12 Rue Didouche Mourad",
  phone: "+213 555 01 02",
  website: "https://example.dz",
  email: "contact@example.dz",
  latitude: 36.7538,
  longitude: 3.0588,
};

function cleaned(input: unknown): CleanBusiness {
  const result = validateBusinessInput(input);

  if (!result.ok) {
    assert.fail(`expected valid input, received: ${result.message}`);
  }

  return result.value;
}

function invalid(input: unknown): string {
  const result = validateBusinessInput(input);

  if (result.ok) {
    assert.fail("expected input to be rejected");
  }

  return result.message;
}

describe("lead-saving input validation", () => {
  test("accepts and trims a complete business", () => {
    assert.deepEqual(
      cleaned({
        ...base,
        sourceId: `  ${base.sourceId}  `,
        name: `  ${base.name}  `,
        category: `  ${base.category}  `,
        address: `  ${base.address}  `,
        phone: `  ${base.phone}  `,
        website: `  ${base.website}  `,
        email: `  ${base.email}  `,
      }),
      base,
    );
  });

  test("accepts missing optional fields as null", () => {
    assert.deepEqual(cleaned({ sourceId: base.sourceId, name: base.name }), {
      sourceId: base.sourceId,
      name: base.name,
      category: null,
      address: null,
      phone: null,
      website: null,
      email: null,
      latitude: null,
      longitude: null,
    });
  });

  test("ignores unknown fields", () => {
    assert.deepEqual(cleaned({ ...base, extra: "ignored" }), base);
  });

  test("rejects non-objects", () => {
    for (const input of [null, undefined, "business", 42, true]) {
      assert.equal(invalid(input), "The business details are invalid.");
    }
  });

  test("requires a usable source id and name", () => {
    for (const sourceId of [undefined, null, "", "   "]) {
      assert.equal(
        invalid({ ...base, sourceId }),
        "The business is missing a source id or name.",
      );
    }

    for (const name of [undefined, null, "", "   "]) {
      assert.equal(
        invalid({ ...base, name }),
        "The business is missing a source id or name.",
      );
    }
  });

  test("enforces field length limits", () => {
    assert.equal(
      cleaned({ ...base, sourceId: "s".repeat(MAX_SOURCE_ID_LENGTH) }).sourceId
        .length,
      MAX_SOURCE_ID_LENGTH,
    );
    assert.equal(
      invalid({ ...base, sourceId: "s".repeat(MAX_SOURCE_ID_LENGTH + 1) }),
      "The business is missing a source id or name.",
    );

    assert.equal(
      cleaned({ ...base, name: "n".repeat(MAX_NAME_LENGTH) }).name.length,
      MAX_NAME_LENGTH,
    );
    assert.equal(
      invalid({ ...base, name: "n".repeat(MAX_NAME_LENGTH + 1) }),
      "The business is missing a source id or name.",
    );

    for (const field of ["category", "address", "phone", "website", "email"]) {
      assert.equal(
        cleaned({ ...base, [field]: "x".repeat(MAX_TEXT_LENGTH) })[
          field as keyof CleanBusiness
        ],
        "x".repeat(MAX_TEXT_LENGTH),
      );
      assert.equal(
        invalid({ ...base, [field]: "x".repeat(MAX_TEXT_LENGTH + 1) }),
        "The business details are invalid.",
      );
    }
  });

  test("rejects non-string optional text fields", () => {
    for (const field of ["category", "address", "phone", "website", "email"]) {
      assert.equal(
        invalid({ ...base, [field]: 42 }),
        "The business details are invalid.",
      );
    }
  });

  test("validates latitude and longitude ranges", () => {
    assert.equal(cleaned({ ...base, latitude: -90 }).latitude, -90);
    assert.equal(cleaned({ ...base, latitude: 90 }).latitude, 90);
    assert.equal(cleaned({ ...base, longitude: -180 }).longitude, -180);
    assert.equal(cleaned({ ...base, longitude: 180 }).longitude, 180);

    for (const latitude of [-90.0001, 90.0001, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(
        invalid({ ...base, latitude }),
        "The business details are invalid.",
      );
    }

    for (const longitude of [
      -180.0001,
      180.0001,
      Number.NaN,
      Number.NEGATIVE_INFINITY,
    ]) {
      assert.equal(
        invalid({ ...base, longitude }),
        "The business details are invalid.",
      );
    }
  });

  test("allows null coordinates but rejects numeric strings", () => {
    const result = cleaned({ ...base, latitude: null, longitude: null });

    assert.equal(result.latitude, null);
    assert.equal(result.longitude, null);
    assert.equal(
      invalid({ ...base, latitude: "36.75" }),
      "The business details are invalid.",
    );
    assert.equal(
      invalid({ ...base, longitude: "3.05" }),
      "The business details are invalid.",
    );
  });
});

describe("bulk lead input collection", () => {
  test("deduplicates by stable source id and counts invalid inputs", () => {
    const result = collectBusinessesForBulkSave([
      { ...base, name: "First" },
      { sourceId: "missing-name" },
      { ...base, name: "Second" },
      { ...base, sourceId: "other", name: "Other" },
    ]);

    assert.equal(result.failed, 1);
    assert.equal(result.businesses.length, 2);
    assert.equal(result.businesses[0]?.name, "First");
    assert.equal(result.businesses[1]?.sourceId, "other");
  });

  test("handles empty selections", () => {
    assert.deepEqual(collectBusinessesForBulkSave([]), {
      businesses: [],
      failed: 0,
    });
  });

  test("maps a clean business to the database row", () => {
    assert.deepEqual(toBusinessRow(cleaned(base)), {
      source: "overture",
      source_id: base.sourceId,
      name: base.name,
      category: base.category,
      address: base.address,
      city: null,
      phone: base.phone,
      website: base.website,
      email: base.email,
      latitude: base.latitude,
      longitude: base.longitude,
    });
  });
});
