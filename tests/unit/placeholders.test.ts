import assert from "node:assert/strict";
import test from "node:test";

import {
  findUnknownPlaceholders,
  listPlaceholderTokens,
  renderTemplate,
} from "../../features/templates/placeholders.ts";


test("is tolerant to case and inner spaces", () => {
  const result = renderTemplate("{{ Business_Name }}", {
    business_name: "Zed Gym",
  });

  assert.equal(result.text, "Zed Gym");
});

test("supports the outreach placeholders while preserving legacy aliases", () => {
  const result = renderTemplate("{business_name} {my_name} {{contact_name}}", {
    business_name: "Zed Gym",
    my_name: "Alex",
    owner_name: "Sam",
  });

  assert.equal(result.text, "Zed Gym Alex Sam");
});

test("inserts values literally, never as patterns or markup", () => {
  const result = renderTemplate("Hi {{business_name}}", {
    business_name: "$& <b>Co</b> {{city}}",
  });

  assert.equal(result.text, "Hi $& <b>Co</b> {{city}}");
});

test("flags unsupported placeholders without replacing them", () => {
  const result = renderTemplate("Hi {{phone}}", {});

  assert.equal(result.text, "Hi {{phone}}");
  assert.deepEqual(result.unknown, ["{{phone}}"]);
  assert.deepEqual(findUnknownPlaceholders("{{city}} {{ Foo Bar }}"), [
    "{{ Foo Bar }}",
  ]);
});

test("lists remaining tokens once each", () => {
  assert.deepEqual(listPlaceholderTokens("{{city}} {{city}} {{your_name}}"), [
    "{{city}}",
    "{{your_name}}",
  ]);
});