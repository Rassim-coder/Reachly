import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";

import { ResetPasswordScreen } from "./reset-password-screen";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * The page reads the recovery session from cookies, so it must be allowed to
 * block instead of being prerendered (Next.js 16 cache components).
 */
export const instant = false;

export const metadata: Metadata = {
  title: `Reset password — ${APP_NAME}`,
};

/**
 * Password recovery landing page.
 *
 * `/auth/callback?next=/reset-password` exchanges the recovery code for a
 * session before redirecting here. Without a session the link is treated as
 * invalid or expired and the user is pointed back to the sign-in page.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <ResetPasswordScreen email={user?.email ?? null} className={inter.className} />
  );
}
