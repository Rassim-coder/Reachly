"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getLeadTemplateContext,
  listTemplatesForPicker,
} from "../actions";
import { buildMailtoLink, buildWhatsAppLink } from "../outreach-links";
import { listPlaceholderTokens, renderTemplate } from "../placeholders";
import {
  TEMPLATE_CHANNEL_LABELS,
  type TemplateItem,
  type TemplateLeadContext,
} from "../Types";

const fieldClasses =
  "w-full rounded-xl border border-line bg-field px-3 py-2 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none";

const buttonClasses =
  "inline-flex h-[34px] w-fit items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const secondaryButtonClasses =
  "inline-flex h-[34px] w-fit items-center rounded-full border border-line bg-surface px-4 text-[12px] font-medium text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50";

type Loaded =
  | { ok: true; templates: TemplateItem[]; context: TemplateLeadContext }
  | { ok: false; message: string };

type CopyResult = { ok: boolean; message: string };

/**
 * Lets the user pick a template, review a personalized draft, edit it and copy
 * it. Messages are never sent from Reachly: the user pastes the text into their
 * own email or WhatsApp app, then comes back to log a note or a follow-up.
 *
 * Render with `key={leadId}` so state resets when another lead is opened.
 */
export function TemplatePicker({ leadId }: { leadId: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listTemplatesForPicker(), getLeadTemplateContext(leadId)])
      .then(([templates, context]) => {
        if (cancelled) return;

        if (templates === null) {
          setLoaded({ ok: false, message: "Templates are unavailable right now." });
        } else if (!context.ok) {
          setLoaded({ ok: false, message: context.message });
        } else {
          setLoaded({ ok: true, templates, context: context.context });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({
            ok: false,
            message: "Could not reach the server. Please try again.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loaded === null) {
    return <p className="text-[12px] text-faint">Loading templates…</p>;
  }

  if (!loaded.ok) {
    return (
      <p role="alert" className="text-[12px] text-red-400">
        {loaded.message}
      </p>
    );
  }

  if (loaded.templates.length === 0) {
    return (
      <p className="text-[12px] text-muted">
        You have no templates yet.{" "}
        <Link href="/templates" className="text-primary hover:underline">
          Create a template
        </Link>
      </p>
    );
  }

  const { templates, context } = loaded;
  const selected = templates.find((template) => template.id === templateId);
  const isEmail = selected?.channel === "email";

  const values = {
    business_name: context.businessName,
    city: context.city,
    category: context.category,
    owner_name: context.contactName,
    my_name: context.yourName,
    my_company: context.myCompany,
  };

  function handleSelect(nextId: string) {
    setTemplateId(nextId);
    setCopyResult(null);

    const template = templates.find((item) => item.id === nextId);

    if (!template) {
      setSubject("");
      setMessage("");
      return;
    }

    setSubject(
      template.subject ? renderTemplate(template.subject, values).text : "",
    );
    setMessage(renderTemplate(template.body, values).text);
  }

  async function copy(text: string, label: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");

      await navigator.clipboard.writeText(text);
      setCopyResult({
        ok: true,
        message: `${label} copied. Paste it in your ${
          isEmail ? "email app" : "WhatsApp"
        }, then come back to log what happened.`,
      });
    } catch {
      setCopyResult({
        ok: false,
        message: "Could not copy automatically. Select the text and copy it manually.",
      });
    }
  }

  const unresolved = listPlaceholderTokens(`${subject}\n${message}`);
  const hasUnresolved = unresolved.length > 0;

  // The link opens the user's own app with the text prefilled. Nothing is sent.
  const outreach = !selected
    ? null
    : isEmail
      ? buildMailtoLink(context.email, subject, message)
      : buildWhatsAppLink(context.phone, message);
  const outreachLabel = isEmail ? "Open email app" : "Open WhatsApp";
  const copyButtonClasses = outreach?.url ? secondaryButtonClasses : buttonClasses;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="lead-template"
          className="block text-[12px] font-medium text-muted"
        >
          Template
        </label>
        <select
          id="lead-template"
          value={templateId}
          onChange={(event) => handleSelect(event.target.value)}
          className="h-[34px] w-full rounded-lg border border-line bg-surface px-2 text-[12px] text-foreground focus:border-[#6d3ff0] focus:outline-none"
        >
          <option value="">Choose a template…</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} · {TEMPLATE_CHANNEL_LABELS[template.channel]}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div className="space-y-3">
          {isEmail ? (
            <div className="space-y-1">
              <label
                htmlFor="lead-template-subject"
                className="block text-[12px] font-medium text-muted"
              >
                Subject
              </label>
              <input
                id="lead-template-subject"
                type="text"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setCopyResult(null);
                }}
                className={fieldClasses}
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <label
              htmlFor="lead-template-message"
              className="block text-[12px] font-medium text-muted"
            >
              Message (you can edit it)
            </label>
            <textarea
              id="lead-template-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setCopyResult(null);
              }}
              rows={8}
              className={fieldClasses}
            />
          </div>

          {hasUnresolved ? (
            <p
              role="status"
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-300"
            >
              Some details are not available for this lead:{" "}
              <span className="font-mono">{unresolved.join(", ")}</span>. Replace
              them before sending.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {outreach?.url ? (
              <a
                href={outreach.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses}
              >
                {outreachLabel}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => copy(message, "Message")}
              disabled={message.trim() === ""}
              className={copyButtonClasses}
            >
              {hasUnresolved ? "Copy anyway" : "Copy message"}
            </button>
            {isEmail ? (
              <button
                type="button"
                onClick={() => copy(subject, "Subject")}
                disabled={subject.trim() === ""}
                className={secondaryButtonClasses}
              >
                Copy subject
              </button>
            ) : null}
          </div>

          {outreach?.problem ? (
            <p className="text-[11px] text-faint">
              {outreach.problem} You can still copy the message and send it
              yourself.
            </p>
          ) : outreach?.url ? (
            <p className="text-[11px] text-faint">
              Opens {isEmail ? "your email app" : "WhatsApp"} with the message
              ready. Nothing is sent until you press send there. Then come back
              to set the status to Contacted or schedule a follow-up.
            </p>
          ) : null}

          {copyResult ? (
            <p
              role={copyResult.ok ? "status" : "alert"}
              className={`text-[12px] ${copyResult.ok ? "text-muted" : "text-red-400"}`}
            >
              {copyResult.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}