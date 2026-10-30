import { Suspense } from "react";
import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";

import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: `Sign in — ${APP_NAME}`,
};

/**
 * `searchParams` is URL data (Next.js 16 cache components), so it is resolved
 * inside a `<Suspense>` boundary; the fallback mirrors the centered card shell.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#0D0F16] p-6">
          <div
            aria-hidden="true"
            className="h-96 w-full max-w-[400px] rounded-2xl border border-[#232736] bg-[#151822]"
          />
        </div>
      }
    >
      <ResolvedLoginScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function ResolvedLoginScreen({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const { next, error, mode } = await searchParams;

  // `/auth/callback` sends failed code exchanges here. The code covers both
  // email confirmation and password-recovery links.
  const initialError =
    error === "callback_failed"
      ? "That link is invalid or has expired. Sign in or request a new one."
      : null;

  return (
    <LoginScreen
      next={next ?? ""}
      initialError={initialError}
      initialMode={mode === "signup" || mode === "sign-up" ? "sign-up" : "sign-in"}
    />
  );
}
