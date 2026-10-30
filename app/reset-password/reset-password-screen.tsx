"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";

import { updatePassword, type AuthActionState } from "@/lib/auth/actions";
import { APP_NAME, DASHBOARD_HOME } from "@/lib/constants";

import { AUTH_STYLES } from "@/app/(auth)/auth-styles";
import {
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  LoaderIcon,
  LockIcon,
  MoonIcon,
  SunIcon,
} from "@/app/(auth)/auth-ui";

type Theme = "dark" | "light";

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
};

const INITIAL_STATE: AuthActionState = { error: null, message: null };

const MIN_PASSWORD_LENGTH = 8;

/**
 * Lets the user choose a new password on the recovery session created by
 * `/auth/callback`. Mirrors the login screen's design, validation, and
 * pending/error/success feedback.
 */
export function ResetPasswordScreen({
  email,
  className,
}: {
  email: string | null;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [state, formAction, pending] = useActionState<
    AuthActionState,
    FormData
  >(updatePassword, INITIAL_STATE);

  const updated = !state.error && state.message !== null;

  function clearError(field: keyof FieldErrors) {
    if (!errors[field]) return;

    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }

    const nextErrors: FieldErrors = {};

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      setErrors(nextErrors);
      return;
    }

    setErrors({});
  }

  return (
    <div
      className={`rl-auth ${className ?? ""}`}
      data-theme={theme}
      style={{ fontFamily: "inherit" }}
    >
      <style>{AUTH_STYLES}</style>

      <div className="rl-container">
        {/* ---------- Header ---------- */}
        <header className="rl-header">
          <Link href="/" className="rl-header-logo">
            <Image
              src="/reachly-logo-mark.png"
              alt=""
              width={477}
              height={571}
              className="h-8 w-auto"
              priority
            />
            <span>{APP_NAME}</span>
          </Link>

          <div className="rl-header-links">
            <Link href="/" className="rl-header-link">
              Back to home
            </Link>
            <button
              type="button"
              className="rl-toggle"
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
            </button>
          </div>
        </header>

        {/* ---------- Main ---------- */}
        <main className="rl-main">
          {!email ? (
            <div className="rl-card">
              <div>
                <h2 className="rl-title">Reset link expired</h2>
                <p className="rl-subtitle">
                  This password reset link is invalid or has expired.
                </p>
              </div>

              <div className="rl-banner rl-banner-error" role="alert">
                <InfoIcon size={14} />
                <span>Request a new link from the sign-in page to continue.</span>
              </div>

              <Link className="rl-submit" href="/login">
                Back to sign in
              </Link>
            </div>
          ) : updated ? (
            <div className="rl-card">
              <div className="rl-card-header">
                <h2 className="rl-title">Password updated</h2>
                <p className="rl-subtitle">
                  {email} can now sign in with the new password.
                </p>
              </div>

              <div
                className="rl-banner rl-banner-success"
                role="status"
                aria-live="polite"
              >
                <CheckIcon size={16} />
                <span>{state.message}</span>
              </div>

              <Link className="rl-submit" href={DASHBOARD_HOME}>
                Continue to dashboard
              </Link>
            </div>
          ) : (
            <form
              className="rl-card"
              action={formAction}
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="rl-card-header">
                <h2 className="rl-title">Set a new password</h2>
                <p className="rl-subtitle">
                  Choose a new password for {email}.
                </p>
              </div>

              {state.error ? (
                <div
                  className="rl-banner rl-banner-error"
                  role="alert"
                  aria-live="assertive"
                >
                  <InfoIcon size={16} />
                  <span>{state.error}</span>
                </div>
              ) : null}

              <div className="rl-fields">
                <div>
                  <label className="rl-label" htmlFor="rl-new-password">
                    New password
                  </label>
                  <div className="rl-field">
                    <span className="rl-input-icon">
                      <LockIcon size={18} />
                    </span>
                    <input
                      id="rl-new-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className={`rl-input rl-input-password ${errors.password ? "rl-input-error" : ""}`}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearError("password");
                      }}
                    />
                    <button
                      type="button"
                      className="rl-eye"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOffIcon size={18} />
                      ) : (
                        <EyeIcon size={18} />
                      )}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="rl-field-error">{errors.password}</p>
                  ) : null}
                </div>

                <div>
                  <label className="rl-label" htmlFor="rl-confirm-password">
                    Confirm new password
                  </label>
                  <div className="rl-field">
                    <span className="rl-input-icon">
                      <LockIcon size={18} />
                    </span>
                    <input
                      id="rl-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
                      className={`rl-input rl-input-password ${errors.confirmPassword ? "rl-input-error" : ""}`}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        clearError("confirmPassword");
                      }}
                    />
                    <button
                      type="button"
                      className="rl-eye"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon size={18} />
                      ) : (
                        <EyeIcon size={18} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword ? (
                    <p className="rl-field-error">{errors.confirmPassword}</p>
                  ) : null}
                </div>
              </div>

              <button type="submit" className="rl-submit" disabled={pending}>
                {pending ? (
                  <>
                    <span className="rl-spinner">
                      <LoaderIcon size={16} />
                    </span>
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <span>Update password</span>
                    <ArrowRightIcon size={16} />
                  </>
                )}
              </button>

              <p className="rl-switch">
                Remembered it?{" "}
                <Link className="rl-link" href="/login">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </main>

        {/* ---------- Footer ---------- */}
        <footer className="rl-footer">
          <div className="rl-footer-links">
            <Link href="/privacy" className="rl-footer-link">
              Privacy Policy
            </Link>
            <Link href="/terms" className="rl-footer-link">
              Terms of Service
            </Link>
          </div>
          <p className="rl-footer-copyright">© 2026 Reachly. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
