"use client";

import { useActionState, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  signInWithPassword,
  signUpWithPassword,
  type AuthActionState,
} from "@/lib/auth/actions";

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
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function Glyph({
  children,
  size = 16,
  strokeWidth = 2,
  fill = "none",
}: {
  children: ReactNode;
  size?: number;
  strokeWidth?: number;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const SendIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Glyph>
);

const BookmarkIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </Glyph>
);

const MessageCircleIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Glyph>
);

const UserIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Glyph>
);

const MailIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Glyph>
);

const LockIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Glyph>
);

const EyeIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Glyph>
);

const EyeOffIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <path d="m2 2 20 20" />
  </Glyph>
);

const ArrowRightIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Glyph>
);

const LoaderIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Glyph>
);

const MoonIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Glyph>
);

const SunIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </Glyph>
);

const CheckIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Glyph>
);

const InfoIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Glyph>
);

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const STYLES = `
.rl-auth,
.rl-auth *,
.rl-auth *::before,
.rl-auth *::after {
  box-sizing: border-box;
}

.rl-auth {
  --rl-brand-gradient: linear-gradient(135deg, #7C4DFF 0%, #6D3FF0 40%, #0A8FE0 100%);
  min-height: 100vh;
  min-height: 100dvh;
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.rl-auth[data-theme="dark"] {
  --rl-page: #0D0F16;
  --rl-card: #151822;
  --rl-border: #232736;
  --rl-input-bg: #1B1F2C;
  --rl-text: #F3F4F8;
  --rl-secondary: #9AA1B2;
  --rl-muted: #6B7280;
  --rl-primary: #8B6BFF;
  --rl-primary-tint: #231D4A;
  --rl-blue: #0A8FE0;
  --rl-success: #16A34A;
  --rl-success-bg: #12301F;
  --rl-error: #DC2626;
  --rl-error-bg: #2A1416;
  --rl-card-shadow: none;
}

.rl-auth[data-theme="light"] {
  --rl-page: #F7F8FB;
  --rl-card: #FFFFFF;
  --rl-border: #E8EAF0;
  --rl-input-bg: #F3F4F8;
  --rl-text: #111827;
  --rl-secondary: #6B7280;
  --rl-muted: #9CA3AF;
  --rl-primary: #6D3FF0;
  --rl-primary-tint: #EEEAFE;
  --rl-blue: #0A8FE0;
  --rl-success: #16A34A;
  --rl-success-bg: #E8F7EE;
  --rl-error: #DC2626;
  --rl-error-bg: #FEF2F2;
  --rl-card-shadow: 0 1px 3px rgba(16, 24, 40, .06);
}

.rl-auth {
  background: var(--rl-page);
  color: var(--rl-text);
}

.rl-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ---------------- Brand panel ---------------- */

.rl-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 28px;
  overflow: hidden;
  margin: 14px 0 14px 14px;
  padding: 36px 44px;
  border-radius: 20px;
  background: var(--rl-brand-gradient);
  color: #fff;
}

.rl-brand-dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .5;
  background-image: radial-gradient(rgba(255, 255, 255, .18) 1px, transparent 1px);
  background-size: 18px 18px;
}

.rl-brand-block {
  position: relative;
}

.rl-brand-logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rl-brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .2);
  border: 1px solid rgba(255, 255, 255, .3);
}

.rl-brand-name {
  font-size: 15px;
  font-weight: 600;
}

.rl-brand-caption {
  margin: 3px 0 0 40px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .18em;
  opacity: .75;
}

.rl-brand-h1 {
  margin: 0 0 14px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -.02em;
  max-width: 460px;
}

.rl-brand-p {
  margin: 0 0 20px;
  font-size: 14px;
  opacity: .8;
  max-width: 460px;
}

.rl-glass {
  background: rgba(255, 255, 255, .15);
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 14px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.rl-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.rl-stat {
  padding: 14px 16px;
}

.rl-stat-head {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: .8;
  font-size: 12px;
}

.rl-stat-value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
}

.rl-stat-delta {
  margin-top: 4px;
  font-size: 12px;
  color: #6EE7B7;
}

.rl-followups {
  padding: 6px 16px;
}

.rl-fu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.rl-fu-row + .rl-fu-row {
  border-top: 1px solid rgba(255, 255, 255, .18);
}

.rl-fu-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .22);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .02em;
}

.rl-fu-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rl-fu-name {
  font-size: 13px;
  font-weight: 700;
}

.rl-fu-action {
  font-size: 12px;
  opacity: .75;
}

.rl-fu-time {
  margin-left: auto;
  font-size: 12px;
  opacity: .75;
  white-space: nowrap;
}

.rl-brand-footer {
  position: relative;
  font-size: 12px;
  opacity: .7;
}

/* ---------------- Form side ---------------- */

.rl-side {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.rl-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
}

.rl-mobile-logo {
  display: none;
  align-items: center;
  gap: 8px;
  color: var(--rl-primary);
  font-size: 14px;
  font-weight: 600;
}

.rl-mobile-logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--rl-brand-gradient);
  color: #fff;
}

.rl-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--rl-border);
  border-radius: 999px;
  background: var(--rl-card);
  color: var(--rl-secondary);
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.rl-toggle:hover {
  background: var(--rl-input-bg);
  color: var(--rl-text);
}

.rl-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
}

.rl-page-foot {
  padding: 0 20px 14px;
  text-align: center;
  font-size: 11px;
  color: var(--rl-muted);
}

/* ---------------- Card ---------------- */

.rl-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  padding: 26px;
  border: 1px solid var(--rl-border);
  border-radius: 16px;
  background: var(--rl-card);
  box-shadow: var(--rl-card-shadow);
}

.rl-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.rl-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--rl-secondary);
}

.rl-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 3px;
  border-radius: 999px;
  background: var(--rl-input-bg);
}

.rl-seg-btn {
  border: 0;
  border-radius: 999px;
  padding: 7px 0;
  background: transparent;
  color: var(--rl-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 150ms ease;
}

.rl-seg-btn:hover {
  color: var(--rl-text);
}

.rl-seg-btn.rl-seg-active {
  background: var(--rl-card);
  color: var(--rl-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .18);
}

.rl-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
}

.rl-banner svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.rl-banner-success {
  background: var(--rl-success-bg);
  color: var(--rl-success);
}

.rl-banner-info {
  background: var(--rl-primary-tint);
  color: var(--rl-primary);
}

.rl-banner-error {
  background: var(--rl-error-bg);
  color: var(--rl-error);
}

.rl-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rl-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rl-text);
}

.rl-field {
  position: relative;
}

.rl-input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--rl-border);
  border-radius: 10px;
  background: var(--rl-input-bg);
  color: var(--rl-text);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 150ms ease, background-color 150ms ease,
    box-shadow 150ms ease;
}

.rl-input::placeholder {
  color: var(--rl-muted);
}

.rl-input:focus {
  outline: none;
  border-color: var(--rl-primary);
  background: var(--rl-card);
  box-shadow: 0 0 0 3px var(--rl-primary-tint);
}

.rl-input.rl-input-error {
  border-color: var(--rl-error);
}

.rl-input.rl-input-password {
  padding-right: 40px;
}

.rl-input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: var(--rl-muted);
  pointer-events: none;
}

.rl-eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--rl-muted);
  cursor: pointer;
  transition: color 150ms ease;
}

.rl-eye:hover {
  color: var(--rl-text);
}

.rl-field-error {
  margin-top: 4px;
  font-size: 11px;
  color: var(--rl-error);
}

.rl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rl-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--rl-secondary);
  cursor: pointer;
}

.rl-check input {
  width: 15px;
  height: 15px;
  accent-color: var(--rl-primary);
}

.rl-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--rl-primary);
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  cursor: pointer;
}

.rl-link:hover {
  text-decoration: underline;
}

.rl-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #6D3FF0 0%, #0A8FE0 100%);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(109, 63, 240, .3);
  transition: filter 150ms ease;
}

.rl-submit:hover:not(:disabled) {
  filter: brightness(1.07);
}

.rl-submit:disabled {
  cursor: default;
  opacity: .75;
}

.rl-spinner {
  animation: rl-rotate 800ms linear infinite;
}

@keyframes rl-rotate {
  to {
    transform: rotate(360deg);
  }
}

.rl-switch {
  text-align: center;
  font-size: 13px;
  color: var(--rl-secondary);
}

/* ---------------- Keyboard & motion ---------------- */

.rl-auth a:focus-visible,
.rl-auth button:focus-visible,
.rl-auth .rl-check input:focus-visible {
  outline: 2px solid var(--rl-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .rl-auth *,
  .rl-auth *::before,
  .rl-auth *::after {
    transition: none !important;
    animation: none !important;
  }
}

/* ---------------- Responsive ---------------- */

@media (max-width: 899.98px) {
  .rl-grid {
    grid-template-columns: 1fr;
  }

  .rl-brand {
    display: none;
  }

  .rl-mobile-logo {
    display: flex;
  }
}
`;

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
  className,
}: {
  next?: string;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<Banner>(null);
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

  function handleForgotPassword() {
    const address = email.trim();
    if (!address) {
      setBanner({
        tone: "info",
        message: "Enter your email first so we know where the reset would go.",
      });
      return;
    }
    setBanner({
      tone: "info",
      message: `Password reset isn’t set up yet, so no email was sent to ${address}.`,
    });
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
      <style>{STYLES}</style>

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
                  >
                    Forgot password?
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
