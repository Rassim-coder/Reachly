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
  color: var(--rl-secondary);
}

/* Standalone screens (password reset) use the brand row inside the card. */

.rl-page-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--rl-primary);
  font-size: 14px;
  font-weight: 600;
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
