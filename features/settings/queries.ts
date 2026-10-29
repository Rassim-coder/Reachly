import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  parseFollowUpNotificationPreferences,
  type FollowUpNotificationPreferences,
} from "@/features/follow-ups/notifications";

export type SettingsPageData = {
  fullName: string;
  email: string;
  notificationPreferences: FollowUpNotificationPreferences;
};

export type SettingsPageResult =
  | { ok: true; data: SettingsPageData }
  | { ok: false; message: string };

const readSettingsForRequest = cache(
  async (): Promise<SettingsPageResult> => {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Sign in to view Settings." };

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("getSettingsPageData: failed to read profile", error);
      return {
        ok: false,
        message: "Could not load your settings. Please try again.",
      };
    }

    const authName =
      typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";

    return {
      ok: true,
      data: {
        fullName: profile?.full_name?.trim() || authName,
        email: user.email ?? "",
        notificationPreferences: parseFollowUpNotificationPreferences(
          user.user_metadata.reachly_notification_preferences,
        ),
      },
    };
  },
);

export async function getSettingsPageData(): Promise<SettingsPageResult> {
  return readSettingsForRequest();
}

/** The profile table is canonical for the shared sidebar/header display name. */
export async function getProfileDisplayName(): Promise<string | null> {
  const result = await readSettingsForRequest();
  if (!result.ok) return null;
  return result.data.fullName.trim() || null;
}
