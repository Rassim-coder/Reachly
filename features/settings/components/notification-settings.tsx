"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  FOLLOW_UP_NOTIFICATION_OPTIONS,
  type FollowUpNotificationPreferences,
} from "@/features/follow-ups/notifications";

import { updateFollowUpNotificationPreferences } from "../actions";

export function NotificationSettings({
  initialPreferences,
}: {
  initialPreferences: FollowUpNotificationPreferences;
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const hasChanges = Object.keys(preferences).some((key) => {
    const preferenceKey = key as keyof FollowUpNotificationPreferences;
    return preferences[preferenceKey] !== savedPreferences[preferenceKey];
  });

  function togglePreference(key: keyof FollowUpNotificationPreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setFeedback(null);
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await updateFollowUpNotificationPreferences(preferences);
        setFeedback({ ok: result.ok, message: result.message });
        if (result.ok) {
          const saved = result.notificationPreferences ?? preferences;
          setPreferences(saved);
          setSavedPreferences(saved);
          router.refresh();
        }
      } catch {
        setFeedback({
          ok: false,
          message: "Could not save notification preferences. Please try again.",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted">
        Choose which outstanding follow-ups appear in the dashboard bell. Turning a notification off never changes or completes its lead.
      </p>
      <div className="divide-y divide-line rounded-xl border border-line">
        {FOLLOW_UP_NOTIFICATION_OPTIONS.map((option) => (
          <NotificationSwitch
            key={option.key}
            label={option.label}
            description={option.description}
            checked={preferences[option.key]}
            disabled={pending}
            onChange={() => togglePreference(option.key)}
          />
        ))}
      </div>
      {feedback ? (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`text-[12px] ${feedback.ok ? "text-positive" : "text-red-400"}`}
        >
          {feedback.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleSave}
        disabled={pending || !hasChanges}
        className="inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save notification settings"}
      </button>
    </div>
  );
}

function NotificationSwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors ${
          checked ? "bg-primary" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-4 rounded-full bg-white shadow-sm motion-safe:transition-transform motion-reduce:transition-none ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
