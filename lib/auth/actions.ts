"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

export type AuthActionState = {
  error: string | null;
  message: string | null;
};

const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveOrigin(): Promise<string> {
  const headerList = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    headerList.get("origin") ??
    "http://localhost:3000"
  );
}

export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message, message: null };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { error: "Enter your email and password.", message: null };
  }

  if (!name) {
    return { error: "Enter your full name.", message: null };
  }

  if (formData.get("terms") !== "on") {
    return { error: "Accept the Terms and Privacy Policy to continue.", message: null };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      message: null,
    };
  }

  const origin = await resolveOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // The `handle_new_user` trigger copies this into `profiles.full_name`.
      data: { full_name: name },
    },
  });

  if (error) {
    return { error: error.message, message: null };
  }

  // When email confirmation is disabled Supabase returns a session directly.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNextPath(formData.get("next")));
  }

  return {
    error: null,
    message: "Check your email to confirm your account, then sign in.",
  };
}

/**
 * Sends a Supabase password-recovery email.
 *
 * The email link points at the shared `/auth/callback` route, which exchanges
 * the recovery code for a session and forwards the user to `/reset-password`.
 *
 * Supabase Dashboard setup: add every origin this app is served from to
 * Authentication → URL Configuration → Redirect URLs, including
 * `http://localhost:3000/auth/callback` for local development and
 * `<production site>/auth/callback` in production.
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<AuthActionState> {
  const email = typeof input?.email === "string" ? input.email.trim() : "";

  if (!email) {
    return { error: "Enter your email first.", message: null };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address.", message: null };
  }

  const origin = await resolveOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=%2Freset-password`,
  });

  if (error) {
    return { error: error.message, message: null };
  }

  // Never reveal whether the address belongs to an existing account.
  return {
    error: null,
    message: `If an account exists for ${email}, a reset link is on its way.`,
  };
}

/**
 * Sets a new password for the recovery session created by `/auth/callback`.
 */
export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      message: null,
    };
  }

  if (password !== confirmation) {
    return { error: "Passwords do not match.", message: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset link is invalid or has expired. Request a new one.",
      message: null,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message, message: null };
  }

  revalidatePath("/", "layout");

  return {
    error: null,
    message: "Password updated. You can now continue to your dashboard.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
