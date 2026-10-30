"use client";

import { useActionState, useState } from "react";
import type { FormEvent } from "react";

import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  type AuthActionState,
} from "@/lib/auth/actions";

import { AUTH_STYLES } from "../auth-styles";
import {
  ArrowRightIcon,
  BookmarkIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  LoaderIcon,
  LockIcon,
  MailIcon,
  MessageCircleIcon,
  MoonIcon,
  SendIcon,
  SunIcon,
  UserIcon,
} from "../auth-ui";

type Theme = "dark" | "light";
type Mode = "sign-in" | "sign-up";
type Banner = { tone: "success" | "info" | "error"; message: string } | null;
type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_AUTH_STATE: AuthActionState = { error: null, message: null };

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

const FOLLOW_UPS = [
  { initials: "AD", name: "Atlas Dental", action: "send the quote", time: "Today" },
  { initials: "BC", name: "Blida Café", action: "WhatsApp reminder", time: "Today" },
  { initials: "NB", name: "Nour Bakery", action: "call back", time: "Tomorrow" },
];

export function LoginScreen({
  next = "",
  initialError = null,
  initialMode = "sign-in",
  className,
}: {
  next?: string;
  initialError?: string | null;
  initialMode?: Mode;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<Banner>(
    initialError ? { tone: "error", message: initialError } : null,
  );
  const [resetPending, setResetPending] = useState(false);
  const [result, formAction, pending] = useActionState<
    AuthActionState,
    FormData
  >(
    mode === "sign-in" ? signInWithPassword : signUpWithPassword,
    INITIAL_AUTH_STATE,
  );
  // Snapshot of the last action result at the moment it was dismissed (mode
  // switch or a new submit), so stale results never show in the wrong view.
  const [dismissedResult, setDismissedResult] =
    useState<AuthActionState>(INITIAL_AUTH_STATE);

  function switchMode(nextMode: Mode) {
    if (pending || nextMode === mode) return;
    setMode(nextMode);
    setErrors({});
    setBanner(null);
    setDismissedResult(result);
  }

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }

    const nextErrors: FieldErrors = {};

    if (mode === "sign-up" && !name.trim()) {
      nextErrors.name = "Enter your full name.";
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (mode === "sign-up" && !terms) {
      nextErrors.terms = "Please accept the terms to continue.";
    }

    if (Object.keys(nextErrors).length > 0) {
      // Blocks the form action; React skips the action when the submit event
      // is default-prevented.
      event.preventDefault();
      setErrors(nextErrors);
      setBanner({ tone: "info", message: "Please fix the highlighted fields." });
      return;
    }

    setErrors({});
    setBanner(null);
    setDismissedResult(result);
  }

  async function handleForgotPassword() {
    if (pending || resetPending) return;

    const address = email.trim();
    if (!address) {
      setBanner({
        tone: "info",
        message: "Enter your email first so we can send the reset link.",
      });
      return;
    }

    setResetPending(true);
    setBanner({ tone: "info", message: "Sending reset link…" });

    try {
      const resetResult = await requestPasswordReset({ email: address });

      if (resetResult.error) {
        setBanner({ tone: "error", message: resetResult.error });
      } else if (resetResult.message) {
        setBanner({ tone: "info", message: resetResult.message });
      }
    } catch {
      setBanner({
        tone: "error",
        message: "Could not send the reset link. Please try again.",
      });
    } finally {
      setResetPending(false);
    }
  }

  const resultBanner: Banner =
    result !== dismissedResult
      ? result.error
        ? { tone: "error", message: result.error }
        : result.message
          ? { tone: "info", message: result.message }
          : null
      : null;

  const shownBanner = banner ?? resultBanner;

  return (
    <div
      className={`rl-auth ${className ?? ""}`}
      data-theme={theme}
      style={{ fontFamily: "inherit" }}
    >
      <style>{AUTH_STYLES}</style>

      <div className="rl-grid">
        {/* ---------- Left brand panel (desktop) ---------- */}
        <aside className="rl-brand" aria-hidden="true">
          <div className="rl-brand-dots" />

          <div className="rl-brand-block">
            <div className="rl-brand-logo-row">
              <span className="rl-brand-logo">
                <SendIcon size={15} />
              </span>
              <span className="rl-brand-name">Reachly</span>
            </div>
            <p className="rl-brand-caption">PROSPECTING</p>
          </div>

          <div className="rl-brand-block">
            <h1 className="rl-brand-h1">
              Find local businesses. Reach out. Follow up.
            </h1>
            <p className="rl-brand-p">
              Save promising leads, keep every conversation in one place, and
              never miss a follow-up.
            </p>

            <div className="rl-stats">
              <div className="rl-glass rl-stat">
                <div className="rl-stat-head">
                  <BookmarkIcon size={14} />
                  <span>Leads Saved</span>
                </div>
                <div className="rl-stat-value">248</div>
                <div className="rl-stat-delta">+18.4% vs last month</div>
              </div>
              <div className="rl-glass rl-stat">
                <div className="rl-stat-head">
                  <MessageCircleIcon size={14} />
                  <span>Replies</span>
                </div>
                <div className="rl-stat-value">34</div>
                <div className="rl-stat-delta">+26.1% vs last month</div>
              </div>
            </div>

            <div className="rl-glass rl-followups">
              {FOLLOW_UPS.map((item) => (
                <div key={item.name} className="rl-fu-row">
                  <span className="rl-fu-avatar">{item.initials}</span>
                  <span className="rl-fu-text">
                    <span className="rl-fu-name">{item.name}</span>
                    <span className="rl-fu-action">{item.action}</span>
                  </span>
                  <span className="rl-fu-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="rl-brand-footer">Sample data shown for illustration.</p>
        </aside>

        {/* ---------- Right form side ---------- */}
        <section className="rl-side">
          <div className="rl-topbar">
            <div className="rl-mobile-logo">
              <span className="rl-mobile-logo-icon">
                <SendIcon size={14} />
              </span>
              <span>Reachly</span>
            </div>

            <button
              type="button"
              className="rl-toggle"
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
            </button>
          </div>

          <main className="rl-center">
            <form
              className="rl-card"
              action={formAction}
              onSubmit={handleSubmit}
              noValidate
            >
              <input type="hidden" name="next" value={next} />

              <div>
                <h2 className="rl-title">
                  {mode === "sign-in" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="rl-subtitle">
                  {mode === "sign-in"
                    ? "Sign in to pick up where you left off."
                    : "Start saving leads in a couple of minutes."}
                </p>
              </div>

              <div className="rl-seg" role="group" aria-label="Authentication mode">
                <button
                  type="button"
                  className={`rl-seg-btn ${mode === "sign-in" ? "rl-seg-active" : ""}`}
                  aria-pressed={mode === "sign-in"}
                  onClick={() => switchMode("sign-in")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`rl-seg-btn ${mode === "sign-up" ? "rl-seg-active" : ""}`}
                  aria-pressed={mode === "sign-up"}
                  onClick={() => switchMode("sign-up")}
                >
                  Create account
                </button>
              </div>

              {shownBanner ? (
                <div
                  className={`rl-banner rl-banner-${shownBanner.tone}`}
                  role="status"
                  aria-live="polite"
                >
                  {shownBanner.tone === "success" ? (
                    <CheckIcon size={14} />
                  ) : (
                    <InfoIcon size={14} />
                  )}
                  <span>{shownBanner.message}</span>
                </div>
              ) : null}

              <div className="rl-fields">
                {mode === "sign-up" ? (
                  <div>
                    <label className="rl-label" htmlFor="rl-name">
                      Full name
                    </label>
                    <div className="rl-field">
                      <span className="rl-input-icon">
                        <UserIcon size={16} />
                      </span>
                      <input
                        id="rl-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Rassim"
                        className={`rl-input ${errors.name ? "rl-input-error" : ""}`}
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          clearError("name");
                        }}
                      />
                    </div>
                    {errors.name ? (
                      <p className="rl-field-error">{errors.name}</p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label className="rl-label" htmlFor="rl-email">
                    Email
                  </label>
                  <div className="rl-field">
                    <span className="rl-input-icon">
                      <MailIcon size={16} />
                    </span>
                    <input
                      id="rl-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className={`rl-input ${errors.email ? "rl-input-error" : ""}`}
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearError("email");
                      }}
                    />
                  </div>
                  {errors.email ? (
                    <p className="rl-field-error">{errors.email}</p>
                  ) : null}
                </div>

                <div>
                  <label className="rl-label" htmlFor="rl-password">
                    Password
                  </label>
                  <div className="rl-field">
                    <span className="rl-input-icon">
                      <LockIcon size={16} />
                    </span>
                    <input
                      id="rl-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
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
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="rl-field-error">{errors.password}</p>
                  ) : null}
                </div>
              </div>

              {mode === "sign-in" ? (
                <div className="rl-row">
                  <label className="rl-check">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="rl-link"
                    onClick={handleForgotPassword}
                    disabled={resetPending || pending}
                  >
                    {resetPending ? "Sending…" : "Forgot password?"}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="rl-check">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={terms}
                      onChange={(event) => {
                        setTerms(event.target.checked);
                        clearError("terms");
                      }}
                    />
                    <span>I agree to the Terms and Privacy Policy</span>
                  </label>
                  {errors.terms ? (
                    <p className="rl-field-error">{errors.terms}</p>
                  ) : null}
                </div>
              )}

              <button type="submit" className="rl-submit" disabled={pending}>
                {pending ? (
                  <>
                    <span className="rl-spinner">
                      <LoaderIcon size={15} />
                    </span>
                    <span>Please wait…</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "sign-in" ? "Sign in" : "Create account"}</span>
                    <ArrowRightIcon size={15} />
                  </>
                )}
              </button>

              <p className="rl-switch">
                {mode === "sign-in" ? (
                  <>
                    New to Reachly?{" "}
                    <button
                      type="button"
                      className="rl-link"
                      onClick={() => switchMode("sign-up")}
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="rl-link"
                      onClick={() => switchMode("sign-in")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </form>
          </main>

          <p className="rl-page-foot">© 2026 Reachly</p>
        </section>
      </div>
    </div>
  );
}
