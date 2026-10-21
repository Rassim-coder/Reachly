import type { ReactNode } from "react";

/**
 * Shared icon primitives for the unauthenticated auth screens.
 *
 * Plain module (no hooks, no "use client") so both the login and reset-password
 * screens render the same icon language.
 */

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

export const SendIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Glyph>
);

export const BookmarkIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </Glyph>
);

export const MessageCircleIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Glyph>
);

export const UserIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Glyph>
);

export const MailIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Glyph>
);

export const LockIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Glyph>
);

export const EyeIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Glyph>
);

export const EyeOffIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <path d="m2 2 20 20" />
  </Glyph>
);

export const ArrowRightIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Glyph>
);

export const LoaderIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Glyph>
);

export const MoonIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Glyph>
);

export const SunIcon = ({ size }: { size?: number }) => (
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

export const CheckIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Glyph>
);

export const InfoIcon = ({ size }: { size?: number }) => (
  <Glyph size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Glyph>
);
