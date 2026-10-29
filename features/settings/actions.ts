"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  validateFollowUpNotificationPreferences,
  type FollowUpNotificationPreferences,
} from "@/features/follow-ups/notifications";

import { validateProfileName } from "./validation";

export type SettingsMutationResult =
  | {
      ok: true;
      message: string;
      fullName?: string;
      notificationPreferences?: FollowUpNotificationPreferences;
    }
  | { ok: false; message: string };

export async function updateProfileName(
  input: unknown,
): Promise<SettingsMutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to update your profile." };

  const cleaned = validateProfileName(input);
  if (!cleaned.ok) return cleaned;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: cleaned.value })
    .select("full_name")
    .maybeSingle();

  if (error || !data) {
    console.error("updateProfileName: profile update failed", error);
    return { ok: false, message: "Could not save your name. Please try again." };
  }

  revalidatePath("/(dashboard)", "layout");
  revalidatePath("/settings");

  return { ok: true, message: "Your name was saved.", fullName: data.full_name };
}

export async function updateFollowUpNotificationPreferences(
  input: unknown,
): Promise<SettingsMutationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Sign in to update notification settings." };
  }

  const preferences = validateFollowUpNotificationPreferences(input);
  if (!preferences) {
    return { ok: false, message: "Choose a valid set of notification preferences." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      reachly_notification_preferences: preferences,
    },
  });

  if (error) {
    console.error("updateFollowUpNotificationPreferences: update failed", error);
    return {
      ok: false,
      message: "Could not save notification preferences. Please try again.",
    };
  }

  revalidatePath("/(dashboard)", "layout");
  revalidatePath("/settings");

  return {
    ok: true,
    message: "Notification preferences saved.",
    notificationPreferences: preferences,
  };
}
