/**
 * Centralised environment access.
 *
 * Only `NEXT_PUBLIC_*` values are available in the browser. Next.js inlines
 * them at build time, so they must be read statically (never through a dynamic
 * `process.env[key]` lookup) for the client bundle to receive them.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        "Copy .env.example to .env and fill in your Supabase project values.",
    );
  }

  return value;
}

export const supabaseUrl = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

/**
 * Supabase publishable key (the newer replacement for the legacy `anon` key).
 * Safe to expose to the browser; access control is enforced by RLS.
 */
export const supabasePublishableKey = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
