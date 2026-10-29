import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMailtoLink,
  buildWhatsAppLink,
  toWhatsAppNumber,
} from "../../features/templates/outreach-links.ts";

test("converts local and international phone formats", () => {
  assert.equal(toWhatsAppNumber("0550 12 34 56"), "213550123456");
  assert.equal(toWhatsAppNumber("+213 550 12 34 56"), "213550123456");
  assert.equal(toWhatsAppNumber("00213550123456"), "213550123456");
  assert.equal(toWhatsAppNumber("213550123456"), "213550123456");
  assert.equal(toWhatsAppNumber("+33 6 12 34 56 78"), "33612345678");
});

test("refuses numbers it cannot place", () => {
  assert.equal(toWhatsAppNumber("550123456"), null);
  assert.equal(toWhatsAppNumber("12"), null);
  assert.equal(toWhatsAppNumber("   "), null);
  assert.equal(toWhatsAppNumber(null), null);
});

test("builds a WhatsApp link with the message encoded", () => {
  const link = buildWhatsAppLink("0550123456", "Bonjour & merci\nà vous");

  assert.equal(
    link.url,
    "https://wa.me/213550123456?text=Bonjour%20%26%20merci%0A%C3%A0%20vous",
  );
});

test("reports why a WhatsApp link is unavailable", () => {
  assert.equal(buildWhatsAppLink(null, "Hi").url, null);
  assert.match(buildWhatsAppLink("", "Hi").problem ?? "", /no phone/);
  assert.match(buildWhatsAppLink("abc", "Hi").problem ?? "", /not recognized/);
  assert.match(
    buildWhatsAppLink("0550123456", "x".repeat(3000)).problem ?? "",
    /too long/,
  );
});

test("builds a mailto link with CRLF body and encoded subject", () => {
  const link = buildMailtoLink("contact@atlas.dz", "Idée & offre", "Bonjour\nMerci");

  assert.equal(
    link.url,
    "mailto:contact@atlas.dz?subject=Id%C3%A9e%20%26%20offre&body=Bonjour%0D%0AMerci",
  );
});

test("rejects missing or invalid emails", () => {
  assert.match(buildMailtoLink(null, "S", "B").problem ?? "", /no email/);
  assert.match(buildMailtoLink("not-an-email", "S", "B").problem ?? "", /invalid/);
});