"use client";

import { useState } from "react";
import { createPortal, useFormStatus } from "react-dom";

import { LogOutIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";

function SubmitButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Sign out"
      title={pending ? "Signing out..." : "Sign out"}
      className="grid size-4 place-items-center text-faint transition-colors hover:text-red-500 disabled:opacity-60"
      onClick={onClick}
    >
      <LogOutIcon size={16} />
    </button>
  );
}

export function SignOutButton() {
  const [confirming, setConfirming] = useState(false);

  return (
    <form id="sign-out-form" action={signOut}>
      <SubmitButton onClick={() => setConfirming(true)} />
      {confirming
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"
              onClick={() => setConfirming(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sign-out-title"
                aria-describedby="sign-out-description"
                className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-card"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setConfirming(false);
                  }
                }}
              >
                <h2 id="sign-out-title" className="text-base font-semibold text-ink">
                  Confirm sign out
                </h2>
                <p id="sign-out-description" className="mt-2 text-sm text-muted">
                  Are you sure you want to sign out?
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setConfirming(false)}
                    className="w-24 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-field"
                  >
                    No
                  </button>
                  <ConfirmSignOutButton />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </form>
  );
}

function ConfirmSignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      form="sign-out-form"
      disabled={pending}
      className="w-24 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Yes"}
    </button>
  );
}