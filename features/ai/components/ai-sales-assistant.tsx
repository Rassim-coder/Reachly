"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  BotIcon,
  PlusIcon,
  SendIcon,
} from "@/components/ui/icons";
import { Card } from "@/components/ui/page-shell";
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_MESSAGE_LENGTH,
  parseAiChatSession,
  type AiChatContextSummary,
  type AiChatMessage,
  type AiChatResponse,
  type StoredAiChat,
} from "@/features/ai/chat";

const SESSION_KEY = "reachly.ai-chat.v1";
const CHAT_STORAGE_EVENT = "reachly-ai-chat-storage";
const STORAGE_UNAVAILABLE_SNAPSHOT = "__storage-unavailable__";
const STORED_MESSAGE_LIMIT = 40;
const INITIAL_SUGGESTIONS = [
  {
    title: "Help me prioritize",
    question: "Which leads should I focus on first, and why?",
    description: "Find a practical next step from my current pipeline.",
  },
  {
    title: "Review my pipeline",
    question: "What patterns do you see in my leads and their statuses?",
    description: "Spot strengths and gaps in my current prospecting.",
  },
  {
    title: "Plan my follow-ups",
    question: "Help me make a plan for my overdue and upcoming follow-ups.",
    description: "Turn my follow-up queue into a manageable plan.",
  },
  {
    title: "Check my target market",
    question: "How well do my saved leads match my target niches and cities?",
    description: "Compare my lead list with my saved prospecting goals.",
  },
];
const FOLLOW_UP_SUGGESTIONS = [
  "What should I prioritize next?",
  "Which leads need attention?",
  "What information would improve this analysis?",
];

function subscribeToChatStorage(onChange: () => void) {
  window.addEventListener(CHAT_STORAGE_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(CHAT_STORAGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getChatStorageSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return STORAGE_UNAVAILABLE_SNAPSHOT;
  }
}

function getServerChatStorageSnapshot(): null {
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.error)) return null;
  return typeof payload.error.message === "string"
    ? payload.error.message
    : null;
}

function isContextSummary(value: unknown): value is AiChatContextSummary {
  if (!isRecord(value) || !isRecord(value.statusCounts)) return false;
  return (
    typeof value.asOfDate === "string" &&
    typeof value.totalLeads === "number" &&
    typeof value.analyzedLeads === "number" &&
    Object.values(value.statusCounts).every(
      (count) => typeof count === "number",
    )
  );
}

function isChatResponse(payload: unknown): payload is AiChatResponse {
  return (
    isRecord(payload) &&
    typeof payload.answer === "string" &&
    isContextSummary(payload.context)
  );
}

function writeChatToSessionStorage(
  messages: AiChatMessage[],
  contextSharingAllowed: boolean,
): boolean {
  try {
    const stored: StoredAiChat = {
      version: 1,
      contextSharingAllowed,
      messages: messages
        .slice(-STORED_MESSAGE_LIMIT)
        .map((message) => ({
          ...message,
          content: message.content.slice(0, MAX_CHAT_MESSAGE_LENGTH),
        })),
    };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
    return true;
  } catch (storageError) {
    console.error("AI chat: could not save session history", storageError);
    return false;
  }
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export function AiSalesAssistant() {
  const sessionSnapshot = useSyncExternalStore(
    subscribeToChatStorage,
    getChatStorageSnapshot,
    getServerChatStorageSnapshot,
  );
  const restoredChat = parseAiChatSession(
    sessionSnapshot === STORAGE_UNAVAILABLE_SNAPSHOT ? null : sessionSnapshot,
  );
  const restoredMessages = restoredChat.messages;
  const [activeMessages, setActiveMessages] = useState<AiChatMessage[] | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [activeConsent, setActiveConsent] = useState<boolean | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentModalDismissed, setConsentModalDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextSummary, setContextSummary] =
    useState<AiChatContextSummary | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const messages = activeMessages ?? restoredMessages;
  const contextSharingAllowed =
    activeConsent ?? restoredChat.contextSharingAllowed;
  const storageAvailable = sessionSnapshot !== STORAGE_UNAVAILABLE_SNAPSHOT;
  const showConsentModal =
    !contextSharingAllowed && !consentModalDismissed;

  useEffect(() => {
    const container = messagesContainerRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function startNewChat() {
    requestId.current += 1;
    setActiveMessages([]);
    setDraft("");
    setActiveConsent(false);
    setConsentChecked(false);
    setConsentModalDismissed(false);
    setPending(false);
    setError(null);
    setContextSummary(null);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
    } catch (storageError) {
      console.error("AI chat: could not clear session history", storageError);
    }
  }

  function confirmContextSharing() {
    setActiveConsent(true);
    setConsentChecked(false);
    setConsentModalDismissed(false);
    writeChatToSessionStorage(messages, true);
  }

  async function sendMessage(question: string) {
    const cleaned = question.trim();
    if (!cleaned || !contextSharingAllowed || pending) return;

    const currentRequestId = ++requestId.current;
    const userMessage: AiChatMessage = { role: "user", content: cleaned };
    const nextMessages = [...messages, userMessage];
    const requestMessages = nextMessages
      .slice(-MAX_CHAT_MESSAGES)
      .map((message) => ({
        ...message,
        content: message.content.slice(0, MAX_CHAT_MESSAGE_LENGTH),
      }));

    setActiveMessages(nextMessages);
    writeChatToSessionStorage(nextMessages, contextSharingAllowed);
    setDraft("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages,
          shareContext: contextSharingAllowed,
        }),
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        if (requestId.current === currentRequestId) {
          setError("The server returned an invalid response. Please try again.");
        }
        return;
      }

      if (requestId.current !== currentRequestId) return;

      if (!response.ok) {
        setError(
          readErrorMessage(payload) ??
            "The assistant could not answer. Please try again.",
        );
        return;
      }

      if (!isChatResponse(payload)) {
        setError("The server returned an invalid answer. Please try again.");
        return;
      }

      const updatedMessages = [
        ...nextMessages,
        { role: "assistant" as const, content: payload.answer },
      ];
      setActiveMessages(updatedMessages);
      writeChatToSessionStorage(updatedMessages, contextSharingAllowed);
      setContextSummary(payload.context);
    } catch (requestError) {
      if (requestId.current === currentRequestId) {
        console.error("AI chat: request failed", requestError);
        setError("Could not reach the assistant. Please try again.");
      }
    } finally {
      if (requestId.current === currentRequestId) setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-tint text-primary">
              <BotIcon size={20} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold">Reachly AI</h2>
              <p className="text-[11px] text-muted">
                Your thoughtful sales-planning partner
              </p>
            </div>
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-field px-2.5 py-1 text-[10px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-positive" />
              Grounded in your CRM
            </span>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-[11px] font-medium text-muted transition-colors hover:bg-field hover:text-foreground"
          >
            <PlusIcon size={14} />
            New chat
          </button>
        </header>

        <div
          ref={messagesContainerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.length === 0 && !pending ? (
            <div className="mx-auto max-w-[720px] py-1 sm:py-3">
              <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#7c4dff_0%,#6d3ff0_45%,#0a8fe0_100%)] p-6 text-white shadow-card sm:p-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full border border-white/15"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-8 -right-1 size-44 rounded-full border border-white/15"
                />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-medium tracking-wide">
                    <BotIcon size={14} />
                    SALES COPILOT
                  </span>
                  <h3 className="mt-5 max-w-lg text-[25px] font-semibold leading-tight tracking-tight sm:text-[30px]">
                    Let’s make your next move a smart one.
                  </h3>
                  <p className="mt-2 max-w-xl text-[12px] leading-5 text-white/80">
                    Ask about your pipeline, get help prioritizing leads, and
                    turn your goals into a clear next step.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  A few places we can start
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {INITIAL_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.title}
                      type="button"
                      onClick={() => setDraft(suggestion.question)}
                      className="group rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    >
                      <span className="text-[12px] font-semibold text-foreground transition-colors group-hover:text-primary">
                        {suggestion.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-muted">
                        {suggestion.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              {messages.map((message, index) => (
                <ChatBubble key={`${index}-${message.role}`} message={message} />
              ))}

              {pending ? <TypingIndicator /> : null}

              {error ? (
                <div
                  role="alert"
                  className="ml-11 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-800"
                >
                  {error}
                </div>
              ) : null}

              {contextSummary ? (
                <div className="ml-11 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-faint">
                  <span>
                    Context checked {contextSummary.asOfDate}:{" "}
                    {contextSummary.analyzedLeads} recent lead
                    {contextSummary.analyzedLeads === 1 ? "" : "s"} of{" "}
                    {contextSummary.totalLeads}
                  </span>
                  {Object.entries(contextSummary.statusCounts).map(
                    ([status, count]) => (
                      <span key={status} className="capitalize">
                        {formatStatus(status)}: {count}
                      </span>
                    ),
                  )}
                </div>
              ) : null}

              {!pending ? (
                <div className="ml-11 flex flex-wrap gap-2 pt-1">
                  {FOLLOW_UP_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setDraft(suggestion)}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-[10px] text-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-line bg-field/60 px-4 py-3 sm:px-6 sm:py-4">
          {!storageAvailable ? (
            <p className="mx-auto mb-3 max-w-[760px] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              This browser session cannot save chat history. Your conversation
              may not be restored after a reload.
            </p>
          ) : null}

          <div className="mx-auto max-w-[760px]">
            {!contextSharingAllowed ? (
              <button
                type="button"
                onClick={() => {
                  setConsentChecked(false);
                  setConsentModalDismissed(false);
                }}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Review data sharing to start chatting
              </button>
            ) : (
              <>
                <form onSubmit={onSubmit}>
                  <label htmlFor="ai-chat-composer" className="sr-only">
                    Message Reachly AI
                  </label>
                  <div className="rounded-2xl border border-line bg-surface p-2 shadow-card transition-shadow focus-within:border-primary/60 focus-within:shadow-md">
                    <textarea
                      id="ai-chat-composer"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={onComposerKeyDown}
                      maxLength={MAX_CHAT_MESSAGE_LENGTH}
                      rows={2}
                      placeholder="Tell me what you’re trying to achieve, or ask about your leads…"
                      className="max-h-24 min-h-12 w-full resize-y bg-transparent px-2 py-1.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-faint"
                      disabled={pending}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-2 pt-2">
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] text-muted">
                        <span className="size-1.5 shrink-0 rounded-full bg-positive" />
                        Context sharing is on for this discussion
                      </span>
                      <button
                        type="submit"
                        disabled={pending || draft.trim() === ""}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {pending ? "Thinking…" : "Send"}
                        <SendIcon size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-faint">
                    <span>Enter to send · Shift + Enter for a new line</span>
                    <span>{draft.length}/{MAX_CHAT_MESSAGE_LENGTH}</span>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </Card>

      {showConsentModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-consent-title"
            aria-describedby="ai-consent-description"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setConsentChecked(false);
                setConsentModalDismissed(true);
              }
            }}
            className="w-full max-w-[480px] rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-tint text-primary">
                <BotIcon size={19} />
              </span>
              <div>
                <h2 id="ai-consent-title" className="text-[16px] font-semibold">
                  Before we start
                </h2>
                <p
                  id="ai-consent-description"
                  className="mt-2 text-[12px] leading-5 text-muted"
                >
                  To personalize replies, this chat, your targeting goals, and
                  basic details about up to 100 recent leads are shared. Notes
                  and contact details are not shared. This applies to this chat
                  only.
                </p>
              </div>
            </div>
            <label className="mt-5 flex items-start gap-2.5 text-[12px] leading-5 text-foreground">
              <input
                type="checkbox"
                autoFocus
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span>
                I agree to share this information for this chat.
              </span>
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConsentChecked(false);
                  setConsentModalDismissed(true);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-line px-4 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-foreground"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={confirmContextSharing}
                disabled={!consentChecked}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Agree and start chatting
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {isUser ? (
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-tint text-[10px] font-semibold text-primary">
          You
        </span>
      ) : (
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#7c4dff,#0a8fe0)] text-white">
          <BotIcon size={16} />
        </span>
      )}
      <div
        className={`max-w-[min(88%,620px)] rounded-2xl px-4 py-3 ${
          isUser
            ? "rounded-tr-md bg-primary text-white"
            : "rounded-tl-md border border-line bg-surface text-foreground shadow-card"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-[12px] leading-6">
          {message.content}
        </p>
      </div>
    </article>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status" aria-label="Assistant is typing">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#7c4dff,#0a8fe0)] text-white">
        <BotIcon size={16} />
      </span>
      <div className="flex h-11 items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-surface px-4 shadow-card">
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.25s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.125s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary" />
        <span className="ml-2 text-[10px] text-muted">Thinking through your pipeline</span>
      </div>
    </div>
  );
}
