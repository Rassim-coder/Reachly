import { Suspense } from "react";
import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: `Sign in — ${APP_NAME}`,
};

/**
 * The URL-independent shell renders instantly. `searchParams` is URL data, so
 * it is resolved inside a `<Suspense>` boundary (Next.js 16 cache components
 * requires URL data to sit behind one during prerendering and navigation).
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to your prospecting workspace.
        </p>
      </div>

      <Suspense fallback={<LoginFormFallback />}>
        <ResolvedLoginForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResolvedLoginForm({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <LoginForm next={next ?? ""} />;
}

function LoginFormFallback() {
  return (
    <div
      role="status"
      aria-label="Loading sign-in form"
      className="flex flex-col gap-4"
    >
      <div className="h-9 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-9 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-10 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
