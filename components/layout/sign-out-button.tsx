"use client";

import { useFormStatus } from "react-dom";

import { LogOutIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Sign out"
      title={pending ? "Signing out…" : "Sign out"}
      className="grid size-4 place-items-center text-faint disabled:opacity-60"
    >
      <LogOutIcon size={16} />
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}