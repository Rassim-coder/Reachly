import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarketingHome } from "@/features/marketing/components/marketing-home";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_DESCRIPTION, APP_NAME, DASHBOARD_HOME } from "@/lib/constants";

export const instant = false;

export const metadata: Metadata = {
  title: `${APP_NAME} — Find your next customers`,
  description: APP_DESCRIPTION,
};

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(DASHBOARD_HOME);
  }

  return <MarketingHome />;
}
