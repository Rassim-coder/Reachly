import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildFollowUpNotificationItems,
  DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES,
  parseFollowUpNotificationPreferences,
  validateFollowUpNotificationPreferences,
} from "../../features/follow-ups/notifications.ts";
import { validateProfileName } from "../../features/settings/validation.ts";
import {
  parseThemePreference,
  resolveThemePreference,
} from "../../lib/theme.ts";

describe("profile settings validation", () => {
  test("trims and collapses extra name whitespace", () => {
    assert.deepEqual(validateProfileName("  Ada   Lovelace  "), {
      ok: true,
      value: "Ada Lovelace",
    });
  });

  test("rejects empty, non-string, and overlong names", () => {
    assert.equal(validateProfileName("   ").ok, false);
    assert.equal(validateProfileName(null).ok, false);
    assert.equal(validateProfileName("x".repeat(101)).ok, false);
  });
});

describe("appearance preference", () => {
  test("recognizes Light, Dark, and System and defaults unknown values to System", () => {
    assert.equal(parseThemePreference("light"), "light");
    assert.equal(parseThemePreference("dark"), "dark");
    assert.equal(parseThemePreference("system"), "system");
    assert.equal(parseThemePreference("unknown"), "system");
  });

  test("System follows the current operating-system preference", () => {
    assert.equal(resolveThemePreference("system", "light"), "light");
    assert.equal(resolveThemePreference("system", "dark"), "dark");
    assert.equal(resolveThemePreference("light", "dark"), "light");
    assert.equal(resolveThemePreference("dark", "light"), "dark");
  });
});

describe("follow-up notification preferences", () => {
  test("uses stable defaults for existing users without saved settings", () => {
    assert.deepEqual(
      parseFollowUpNotificationPreferences(undefined),
      DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES,
    );
  });

  test("preserves saved values and fills missing values from defaults", () => {
    assert.deepEqual(
      parseFollowUpNotificationPreferences({ dueToday: false, upcoming: true }),
      { dueToday: false, overdue: false, upcoming: true },
    );
  });

  test("validates all supported preference switches before saving", () => {
    assert.equal(
      validateFollowUpNotificationPreferences({ dueToday: true, overdue: false }),
      null,
    );
    assert.deepEqual(
      validateFollowUpNotificationPreferences({
        dueToday: false,
        overdue: true,
        upcoming: false,
      }),
      { dueToday: false, overdue: true, upcoming: false },
    );
  });

  test("only shows actual notification groups enabled by the saved preferences", () => {
    const counts = { dueToday: 1, overdue: 2, upcoming: 4 };
    assert.deepEqual(
      buildFollowUpNotificationItems(
        counts,
        DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES,
      ).map((item) => item.type),
      ["dueToday"],
    );
    assert.deepEqual(
      buildFollowUpNotificationItems(counts, {
        dueToday: false,
        overdue: true,
        upcoming: true,
      }).map((item) => [item.type, item.count]),
      [
        ["overdue", 2],
        ["upcoming", 4],
      ],
    );
    assert.deepEqual(
      buildFollowUpNotificationItems(counts, {
        dueToday: false,
        overdue: false,
        upcoming: false,
      }),
      [],
    );
  });
});
