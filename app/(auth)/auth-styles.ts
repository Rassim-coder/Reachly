/**
 * Shared stylesheet for the unauthenticated auth screens (sign in, password
 * reset). Kept as a plain module so every screen uses the same design tokens,
 * spacing, and component styles.
 */
export const AUTH_STYLES = `
.rl-auth,
.rl-auth *,
.rl-auth *::before,
.rl-auth *::after {
  box-sizing: border-box;
}

.rl-auth {
  --auth-gradient: linear-gradient(135deg, #7C4DFF 0%, #6D3FF0 40%, #0A8FE0 100%);
  min-height: 100vh;
  min-height: 100dvh;
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.rl-auth[data-theme="dark"] {
  --auth-page: #0D0F16;
  --auth-card: #151822;
  --auth-border: #232736;
  --auth-input-bg: #1B1F2C;
  --auth-text: #F3F4F8;
  --auth-secondary: #9AA1B2;
  --auth-muted: #6B7280;
  --auth-primary: #8B6BFF;
  --auth-primary-tint: #231D4A;
  --auth-blue: #0A8FE0;
  --auth-success: #16A34A;
  --auth-success-bg: #12301F;
  --auth-error: #DC2626;
  --auth-error-bg: #2A1416;
  --auth-card-shadow: none;
}

.rl-auth[data-theme="light"] {
  --auth-page: #F7F8FB;
  --auth-card: #FFFFFF;
  --auth-border: #E8EAF0;
  --auth-input-bg: #F3F4F8;
  --auth-text: #111827;
  --auth-secondary: #6B7280;
  --auth-muted: #9CA3AF;
  --auth-primary: #6D3FF0;
  --auth-primary-tint: #EEEAFE;
  --auth-blue: #0A8FE0;
  --auth-success: #16A34A;
  --auth-success-bg: #E8F7EE;
  --auth-error: #DC2626;
  --auth-error-bg: #FEF2F2;
  --auth-card-shadow: 0 1px 3px rgba(16, 24, 40, .06);
}

.rl-auth {
  background: var(--auth-page);
  color: var(--auth-text);
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
  background: var(--auth-gradient);
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
  color: var(--auth-primary);
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
  background: var(--auth-gradient);
  color: #fff;
}

.rl-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--auth-border);
  border-radius: 999px;
  background: var(--auth-card);
  color: var(--auth-secondary);
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.rl-toggle:hover {
  background: var(--auth-input-bg);
  color: var(--auth-text);
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
  color: var(--auth-muted);
}

/* ---------------- Card ---------------- */

.rl-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  padding: 26px;
  border: 1px solid var(--auth-border);
  border-radius: 16px;
  background: var(--auth-card);
  box-shadow: var(--auth-card-shadow);
}

.rl-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.rl-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--auth-secondary);
}

.rl-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 3px;
  border-radius: 999px;
  background: var(--auth-input-bg);
}

.rl-seg-btn {
  border: 0;
  border-radius: 999px;
  padding: 7px 0;
  background: transparent;
  color: var(--auth-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 150ms ease;
}

.rl-seg-btn:hover {
  color: var(--auth-text);
}

.rl-seg-btn.rl-seg-active {
  background: var(--auth-card);
  color: var(--auth-text);
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
  background: var(--auth-success-bg);
  color: var(--auth-success);
}

.rl-banner-info {
  background: var(--auth-primary-tint);
  color: var(--auth-primary);
}

.rl-banner-error {
  background: var(--auth-error-bg);
  color: var(--auth-error);
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
  color: var(--auth-text);
}

.rl-field {
  position: relative;
}

.rl-input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--auth-border);
  border-radius: 10px;
  background: var(--auth-input-bg);
  color: var(--auth-text);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 150ms ease, background-color 150ms ease,
    box-shadow 150ms ease;
}

.rl-input::placeholder {
  color: var(--auth-muted);
}

.rl-input:focus {
  outline: none;
  border-color: var(--auth-primary);
  background: var(--auth-card);
  box-shadow: 0 0 0 3px var(--auth-primary-tint);
}

.rl-input.rl-input-error {
  border-color: var(--auth-error);
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
  color: var(--auth-muted);
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
  color: var(--auth-muted);
  cursor: pointer;
  transition: color 150ms ease;
}

.rl-eye:hover {
  color: var(--auth-text);
}

.rl-field-error {
  margin-top: 4px;
  font-size: 11px;
  color: var(--auth-error);
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
  color: var(--auth-secondary);
  cursor: pointer;
}

.rl-check input {
  width: 15px;
  height: 15px;
  accent-color: var(--auth-primary);
}

.rl-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--auth-primary);
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  cursor: pointer;
}

.rl-link:hover:not(:disabled) {
  text-decoration: underline;
}

.rl-link:disabled {
  cursor: default;
  opacity: .6;
}

.rl-auth a.rl-link,
.rl-auth a.rl-submit {
  text-decoration: none;
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
  color: var(--auth-secondary);
}

/* Standalone screens (password reset) use the brand row inside the card. */

.rl-page-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--auth-primary);
  font-size: 14px;
  font-weight: 600;
}

/* ---------------- Keyboard & motion ---------------- */

.rl-auth a:focus-visible,
.rl-auth button:focus-visible,
.rl-auth .rl-check input:focus-visible {
  outline: 2px solid var(--auth-primary);
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
