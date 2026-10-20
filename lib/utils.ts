/**
 * Minimal class-name helper. Kept dependency-free on purpose; swap for
 * `clsx`/`tailwind-merge` only if the need actually arises.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
