import assert from "node:assert/strict";
import test from "node:test";

import { decodeTemplateContent, encodeTemplateContent } from "../../features/templates/storage.ts";

test("email subject round-trips through the body column", () => {
  const stored = encodeTemplateContent({
    channel: "email",
    subject: "A quick idea for {{business_name}}",
    body: "Hello,\n\nSubject: not a header here",
  });

  assert.deepEqual(decodeTemplateContent("email", stored), {
    subject: "A quick idea for {{business_name}}",
    body: "Hello,\n\nSubject: not a header here",
  });
});

test("whatsapp bodies are stored and read untouched", () => {
  const stored = encodeTemplateContent({
    channel: "whatsapp",
    subject: null,
    body: "Subject: stays in the message",
  });

  assert.equal(stored, "Subject: stays in the message");
  assert.deepEqual(decodeTemplateContent("whatsapp", stored), {
    subject: null,
    body: "Subject: stays in the message",
  });
});

test("email rows without a subject line decode with no subject", () => {
  assert.deepEqual(decodeTemplateContent("email", "Just a body"), {
    subject: null,
    body: "Just a body",
  });
});