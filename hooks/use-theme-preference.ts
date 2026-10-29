"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  applyThemePreference,
  parseThemePreference,
  readStoredThemePreference,
  resolveThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

function subscribeToThemeChanges(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  function onStorageChange(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY) return;
    const preference = readStoredThemePreference();
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = resolveThemePreference(
      preference,
      systemTheme,
    );
    onChange();
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorageChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorageChange);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  return readStoredThemePreference();
}

function getPreferenceServerSnapshot(): ThemePreference {
  return "system";
}

function getResolvedSnapshot(): ResolvedTheme {
  const current = document.documentElement.dataset.theme;
  if (current === "light" || current === "dark") return current;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getResolvedServerSnapshot(): ResolvedTheme {
  return "dark";
}

export function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribeToThemeChanges,
    getPreferenceSnapshot,
    getPreferenceServerSnapshot,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribeToThemeChanges,
    getResolvedSnapshot,
    getResolvedServerSnapshot,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      if (parseThemePreference(readStoredThemePreference()) !== "system") return;
      const resolved = resolveThemePreference(
        "system",
        media.matches ? "dark" : "light",
      );
      document.documentElement.dataset.themePreference = "system";
      document.documentElement.dataset.theme = resolved;
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    };

    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    applyThemePreference(next);
  }, []);

  return { preference, resolvedTheme, setPreference };
}
