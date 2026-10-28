/** Theme preference and early document initialization shared by dashboard UI. */
export const THEME_STORAGE_KEY = "reachly-theme";
export const THEME_CHANGE_EVENT = "reachly-theme-change";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Applies immediately and persists the user's explicit preference. */
export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const systemTheme: ResolvedTheme =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const resolvedTheme = resolveThemePreference(preference, systemTheme);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = resolvedTheme;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // The in-memory theme still applies when storage is unavailable.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return resolvedTheme;
}

export const themeInitScript = `try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='dark'&&p!=='light'&&p!=='system')p='system';var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.dataset.themePreference=p;document.documentElement.dataset.theme=t}catch(e){}`;
