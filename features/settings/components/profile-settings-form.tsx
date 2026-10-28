"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { updateProfileName } from "../actions";
import { MAX_PROFILE_NAME_LENGTH, validateProfileName } from "../validation";

const fieldClasses =
  "h-[38px] w-full rounded-xl border border-line bg-field px-3 text-[13px] text-foreground placeholder:text-faint focus:border-[#6d3ff0] focus:outline-none read-only:cursor-not-allowed read-only:opacity-75";

export function ProfileSettingsForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const cleanedName = name.trim().replace(/\s+/g, " ");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const checked = validateProfileName(name);
    if (!checked.ok) {
      setFeedback({ ok: false, message: checked.message });
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateProfileName(checked.value);
        setFeedback({ ok: result.ok, message: result.message });

        if (result.ok) {
          const updatedName = result.fullName ?? checked.value;
          setName(updatedName);
          setSavedName(updatedName);
          router.refresh();
        }
      } catch {
        setFeedback({
          ok: false,
          message: "Could not save your name. Please try again.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="block text-[12px] font-medium text-muted">Full name</span>
        <input
          type="text"
          name="fullName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_PROFILE_NAME_LENGTH}
          autoComplete="name"
          required
          className={fieldClasses}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="block text-[12px] font-medium text-muted">Account email</span>
        <input
          type="email"
          value={email}
          readOnly
          aria-describedby="profile-email-note"
          className={fieldClasses}
        />
        <span id="profile-email-note" className="block text-[11px] text-faint">
          Email is managed by your sign-in account and can’t be changed here.
        </span>
      </label>

      {feedback ? (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`text-[12px] ${feedback.ok ? "text-positive" : "text-red-400"}`}
        >
          {feedback.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || cleanedName === savedName}
        className="inline-flex h-[34px] items-center justify-center rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
