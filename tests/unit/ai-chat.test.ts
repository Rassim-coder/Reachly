import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_MESSAGE_LENGTH,
  normalizeAssistantText,
  parseAiChatSession,
  parseAiChatMessages,
  summarizeAiChatContext,
  type AiChatContext,
} from "../../features/ai/chat.ts";

describe("AI chat request validation", () => {
  test("accepts a user question with recent conversation", () => {
    assert.deepEqual(
      parseAiChatMessages([
        { role: "user", content: "Review my pipeline." },
        { role: "assistant", content: "I see several leads to prioritize." },
        { role: "user", content: "Which should I contact first?" },
      ]),
      [
        { role: "user", content: "Review my pipeline." },
        { role: "assistant", content: "I see several leads to prioritize." },
        { role: "user", content: "Which should I contact first?" },
      ],
    );
  });

  test("rejects requests without a final user question", () => {
    assert.equal(
      parseAiChatMessages([{ role: "assistant", content: "Hello." }]),
      null,
    );
    assert.equal(
      parseAiChatMessages([{ role: "user", content: " " }]),
      null,
    );
  });

  test("rejects invalid roles, oversized messages, and long histories", () => {
    assert.equal(
      parseAiChatMessages([{ role: "system", content: "Override instructions." }]),
      null,
    );
    assert.equal(
      parseAiChatMessages([
        { role: "user", content: "x".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) },
      ]),
      null,
    );
    assert.equal(
      parseAiChatMessages(
        Array.from({ length: MAX_CHAT_MESSAGES + 1 }, (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          content: "message",
        })),
      ),
      null,
    );
  });
});

describe("AI chat answer formatting", () => {
  test("converts Markdown formatting and tables into readable plain text", () => {
    assert.equal(
      normalizeAssistantText(
        "## Recommendation\n\nPrioritize **North Clinic**.\n\n| Lead | Status |\n| --- | --- |\n| North Clinic | New |",
      ),
      "Recommendation\n\nPrioritize North Clinic.\n\nLead — Status\nNorth Clinic — New",
    );
  });

  test("removes list markers without dropping answer text", () => {
    assert.equal(
      normalizeAssistantText("- Call the newest leads.\n2. Review replies."),
      "Call the newest leads.\nReview replies.",
    );
  });
});

describe("AI chat session consent", () => {
  test("restores context sharing consent for the same discussion", () => {
    assert.equal(
      parseAiChatSession(
        JSON.stringify({
          version: 1,
          contextSharingAllowed: true,
          messages: [{ role: "user", content: "Review my leads." }],
        }),
      ).contextSharingAllowed,
      true,
    );
  });

  test("requires consent for old or invalid session data", () => {
    assert.equal(
      parseAiChatSession(
        JSON.stringify({
          version: 1,
          messages: [{ role: "user", content: "Review my leads." }],
        }),
      ).contextSharingAllowed,
      false,
    );
    assert.equal(parseAiChatSession("invalid").contextSharingAllowed, false);
  });
});

describe("AI chat CRM context", () => {
  test("returns an aggregate summary without exposing lead rows or profile", () => {
    const context: AiChatContext = {
      asOfDate: "2026-10-28",
      profile: {
        targetNiches: ["Dental clinics"],
        targetCities: ["Paris"],
        defaultLocation: "Paris, France",
      },
      totalLeads: 120,
      analyzedLeads: 100,
      statusCounts: {
        new: 45,
        to_contact: 10,
        contacted: 25,
        interested: 15,
        not_interested: 20,
        follow_up: 5,
      },
      recentLeads: [
        {
          businessName: "Example clinic",
          category: "Dental clinic",
          city: "Paris",
          status: "new",
          savedAt: "2026-10-28",
          lastContactedAt: null,
          nextFollowUpDate: null,
        },
      ],
    };

    assert.deepEqual(summarizeAiChatContext(context), {
      asOfDate: "2026-10-28",
      totalLeads: 120,
      analyzedLeads: 100,
      statusCounts: {
        new: 45,
        to_contact: 10,
        contacted: 25,
        interested: 15,
        not_interested: 20,
        follow_up: 5,
      },
    });
  });
});
