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

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
