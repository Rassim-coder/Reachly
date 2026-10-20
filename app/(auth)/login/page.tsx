import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { APP_NAME } from "@/lib/constants";

import { LoginScreen } from "./login-screen";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
  searchParams: Promise<{ next?: string }>;
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
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <LoginScreen next={next ?? ""} className={inter.className} />;
}
