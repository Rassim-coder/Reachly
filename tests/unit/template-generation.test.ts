import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  parseTemplateDraft,
  validateTemplateGenerationInput,
} from "../../features/templates/generation.ts";

const validInput = {
  channel: "email",
  goal: "introduce",
  tone: "professional",
  language: "en",
  offer: "I build websites for restaurants",
  instructions: "",
};

describe("template generation input validation", () => {
  test("accepts and trims valid generation details", () => {
    const result = validateTemplateGenerationInput({
      ...validInput,
      offer: "  I build websites for restaurants  ",
    });

    assert.deepEqual(result, {
      ok: true,
      value: { ...validInput, offer: "I build websites for restaurants" },
    });
  });

  test("rejects missing offers, unsupported values, and oversized text", () => {
    assert.equal(
      validateTemplateGenerationInput({ ...validInput, offer: " " }).ok,
      false,
    );
    assert.equal(
      validateTemplateGenerationInput({ ...validInput, channel: "call" }).ok,
      false,
    );
    assert.equal(
      validateTemplateGenerationInput({
        ...validInput,
        offer: "x".repeat(201),
      }).ok,
      false,
    );
    assert.equal(
      validateTemplateGenerationInput({
        ...validInput,
        instructions: "x".repeat(301),
      }).ok,
      false,
    );
  });
});

describe("template generation JSON parsing", () => {
  test("parses strict email JSON and supported single-brace placeholders", () => {
    assert.deepEqual(
      parseTemplateDraft(
        '```json\n{"subject":"A quick idea for {business_name}","body":"Hi {owner_name}, I help {category} businesses in {city}. {my_name}"}\n```',
        "email",
      ),
      {
        subject: "A quick idea for {business_name}",
        body: "Hi {owner_name}, I help {category} businesses in {city}. {my_name}",
      },
    );
  });

  test("requires null subject for WhatsApp and rejects malformed or unsafe output", () => {
    assert.deepEqual(
      parseTemplateDraft(
        '{"subject":null,"body":"Hello {business_name}, I can help."}',
        "whatsapp",
      ),
      { subject: null, body: "Hello {business_name}, I can help." },
    );
    assert.equal(
      parseTemplateDraft(
        '{"subject":"Hello","body":"Hello there."}',
        "whatsapp",
      ),
      null,
    );
    assert.equal(
      parseTemplateDraft(
        '{"subject":"Hello","body":"Hi {made_up}"}',
        "email",
      ),
      null,
    );
    assert.equal(parseTemplateDraft("not JSON", "email"), null);
    assert.equal(
      parseTemplateDraft(
        '{"subject":"Hello","body":"Message","extra":"ignored"}',
        "email",
      ),
      null,
    );
  });
});
