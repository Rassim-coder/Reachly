import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_TEMPLATE_BODY_LENGTH,
  validateTemplateInput,
} from "../../features/templates/validation.ts";

const email = {
  name: "  Email   intro ",
  channel: "email",
  subject: "A quick idea for {{business_name}}",
  body: "Hello {{contact_name}},\r\nCan we talk?",
};

test("accepts and cleans a valid email template", () => {
  const result = validateTemplateInput(email);

  assert.ok(result.ok);
  assert.equal(result.value.name, "Email intro");
  assert.equal(result.value.body, "Hello {{contact_name}},\nCan we talk?");
});

test("requires a subject for email only", () => {
  assert.equal(validateTemplateInput({ ...email, subject: "  " }).ok, false);

  const whatsapp = validateTemplateInput({
    name: "WhatsApp intro",
    channel: "whatsapp",
    subject: "ignored",
    body: "Hi {{business_name}}",
  });

  assert.ok(whatsapp.ok);
  assert.equal(whatsapp.value.subject, null);
});

test("rejects empty fields and invalid channels", () => {
  assert.equal(validateTemplateInput({ ...email, name: " " }).ok, false);
  assert.equal(validateTemplateInput({ ...email, body: " " }).ok, false);
  assert.equal(validateTemplateInput({ ...email, channel: "sms" }).ok, false);
  assert.equal(validateTemplateInput(null).ok, false);
});

test("rejects over-long messages", () => {
  const result = validateTemplateInput({
    ...email,
    body: "a".repeat(MAX_TEMPLATE_BODY_LENGTH + 1),
  });

  assert.equal(result.ok, false);
});

test("rejects unknown placeholders with a helpful message", () => {
  const result = validateTemplateInput({
    ...email,
    body: "Hi {{buisness_name}}",
  });

  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.message.includes("buisness_name"));
});