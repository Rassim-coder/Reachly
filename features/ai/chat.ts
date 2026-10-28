export const MAX_CHAT_MESSAGES = 12;
export const MAX_CHAT_MESSAGE_LENGTH = 1_500;
export const MAX_CONTEXT_LEADS = 100;

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isStoredChatMessage(value: unknown): value is AiChatMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}

export type StoredAiChat = {
  version: 1;
  messages: AiChatMessage[];
  contextSharingAllowed: boolean;
};

export type AiChatProfile = {
  targetNiches: string[];
  targetCities: string[];
  defaultLocation: string | null;
};

export type AiChatLead = {
  businessName: string;
  category: string | null;
  city: string | null;
  status: string;
  savedAt: string;
  lastContactedAt: string | null;
  nextFollowUpDate: string | null;
};

export type AiChatContext = {
  asOfDate: string;
  profile: AiChatProfile;
  totalLeads: number;
  analyzedLeads: number;
  statusCounts: Record<string, number>;
  recentLeads: AiChatLead[];
};

export type AiChatContextSummary = Pick<
  AiChatContext,
  "asOfDate" | "totalLeads" | "analyzedLeads" | "statusCounts"
>;

export type AiChatResponse = {
  answer: string;
  context: AiChatContextSummary;
};

export function normalizeAssistantText(value: string): string {
  const lines = value
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[^\r\n]*\r?\n?/, "").replace(/```$/, ""),
    )
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "") return "";
      if (/^\|?[\s:|-]+\|?$/.test(trimmed)) return null;

      const withoutTablePipes = trimmed.includes("|")
        ? trimmed
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(" — ")
        : trimmed;

      return withoutTablePipes
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
        .replace(/(?<!_)_([^_]+)_(?!_)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    })
    .filter((line): line is string => line !== null);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseAiChatSession(value: string | null): StoredAiChat {
  const emptyChat: StoredAiChat = {
    version: 1,
    messages: [],
    contextSharingAllowed: false,
  };
  if (!value) return emptyChat;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("messages" in parsed) ||
      !Array.isArray(parsed.messages)
    ) {
      return emptyChat;
    }

    const messages = parsed.messages
      .filter(isStoredChatMessage)
      .map((message) => ({
        role: message.role as AiChatMessage["role"],
        content: message.content.slice(0, MAX_CHAT_MESSAGE_LENGTH),
      }))
      .filter((message) => message.content.trim() !== "")
      .slice(-40);

    return {
      version: 1,
      messages,
      contextSharingAllowed:
        "contextSharingAllowed" in parsed &&
        parsed.contextSharingAllowed === true,
    };
  } catch {
    return emptyChat;
  }
}

export function parseAiChatMessages(value: unknown): AiChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CHAT_MESSAGES) {
    return null;
  }

  const messages: AiChatMessage[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }

    const candidate = item as Record<string, unknown>;
    if (
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      typeof candidate.content !== "string"
    ) {
      return null;
    }

    const content = candidate.content.trim();
    if (content === "" || content.length > MAX_CHAT_MESSAGE_LENGTH) {
      return null;
    }

    messages.push({ role: candidate.role, content });
  }

  if (messages[messages.length - 1]?.role !== "user") return null;
  return messages;
}

export function summarizeAiChatContext(
  context: AiChatContext,
): AiChatContextSummary {
  return {
    asOfDate: context.asOfDate,
    totalLeads: context.totalLeads,
    analyzedLeads: context.analyzedLeads,
    statusCounts: context.statusCounts,
  };
}
