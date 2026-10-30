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
  --auth-gradient: linear-gradient(135deg, #7C4DFF 0%, #6D3FF0 40%, #FA7521 100%);
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
  --auth-page: #FFFFFF;
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

.rl-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ---------------- Header ---------------- */

.rl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.rl-header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--auth-primary);
  font-size: 18px;
  font-weight: 600;
}

.rl-header-logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--auth-gradient);
  color: #fff;
}

.rl-header-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rl-header-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--auth-secondary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 150ms ease;
}

.rl-header-link:hover {
  color: var(--auth-primary);
}

.rl-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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

/* ---------------- Main ---------------- */

.rl-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

/* ---------------- Card ---------------- */

.rl-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  border: 1px solid var(--auth-border);
  border-radius: 16px;
  background: var(--auth-card);
  box-shadow: var(--auth-card-shadow);
}

.rl-card-header {
  text-align: center;
}

.rl-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--auth-text);
}

.rl-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--auth-secondary);
}

.rl-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
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
  gap: 16px;
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
  height: 44px;
  padding: 0 12px 0 40px;
  border: 1px solid var(--auth-border);
  border-radius: 8px;
  background: var(--auth-input-bg);
  color: var(--auth-text);
  font-family: inherit;
  font-size: 14px;
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
  padding-right: 44px;
}

.rl-input.rl-input-password::-ms-reveal,
.rl-input.rl-input-password::-ms-clear {
  display: none;
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
  width: 32px;
  height: 32px;
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
  font-size: 12px;
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
  width: 16px;
  height: 16px;
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
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(90deg, #6D3FF0 0%, #0A8FE0 100%);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(250, 117, 33, .3);
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
  font-size: 14px;
  color: var(--auth-secondary);
}

/* ---------------- Footer ---------------- */

.rl-footer {
  padding: 20px 24px;
  text-align: center;
  border-top: 1px solid var(--auth-border);
}

.rl-footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 12px;
}

.rl-footer-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--auth-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: color 150ms ease;
}

.rl-footer-link:hover {
  color: var(--auth-primary);
}

.rl-footer-copyright {
  font-size: 12px;
  color: var(--auth-muted);
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

@media (max-width: 639.98px) {
  .rl-card {
    padding: 32px 24px;
  }

  .rl-title {
    font-size: 24px;
  }

  .rl-footer-links {
    flex-direction: column;
    gap: 12px;
  }
}
`;
