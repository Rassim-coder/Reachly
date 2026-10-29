"use client";

import { useThemePreference } from "@/hooks/use-theme-preference";
import type { ThemePreference } from "@/lib/theme";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  { value: "light", label: "Light", description: "Use the light appearance." },
  { value: "dark", label: "Dark", description: "Use the dark appearance." },
  { value: "system", label: "System", description: "Follow your device preference." },
];

export function AppearanceSettings() {
  const { preference, resolvedTheme, setPreference } = useThemePreference();

  return (
    <fieldset>
      <legend className="text-[12px] font-medium text-muted">Theme</legend>
      <p className="mt-1 text-[11px] text-faint">
        The header theme toggle and this selection stay in sync.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {themeOptions.map((option) => {
          const selected = preference === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                selected
                  ? "border-primary/60 bg-tint"
                  : "border-line bg-field hover:border-primary/30"
              }`}
            >
              <input
                type="radio"
                name="themePreference"
                value={option.value}
                checked={selected}
                onChange={() => setPreference(option.value)}
                className="mt-0.5 size-4 shrink-0 accent-[#6d3ff0]"
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {preference === "system" ? (
        <p className="mt-2 text-[10px] text-faint" role="status">
          System is currently using {resolvedTheme} mode.
        </p>
      ) : null}
    </fieldset>
  );
}
