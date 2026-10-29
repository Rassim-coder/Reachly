/** User-facing copy for the one grouped due-today notification. */
export function getFollowUpsDueTodayMessage(count: number): string {
  if (count <= 0) return "No follow-ups due today.";
  return `You have ${count} follow-up${count === 1 ? "" : "s"} due today.`;
}

export type FollowUpNotificationPreferences = {
  dueToday: boolean;
  overdue: boolean;
  upcoming: boolean;
};

export type FollowUpNotificationCounts = {
  dueToday: number;
  overdue: number;
  upcoming: number;
};

export type FollowUpNotificationItem = {
  type: keyof FollowUpNotificationPreferences;
  count: number;
  message: string;
};

export const DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES: FollowUpNotificationPreferences = {
  dueToday: true,
  overdue: false,
  upcoming: false,
};

export const FOLLOW_UP_NOTIFICATION_OPTIONS: Array<{
  key: keyof FollowUpNotificationPreferences;
  label: string;
  description: string;
}> = [
  {
    key: "dueToday",
    label: "Follow-ups due today",
    description: "Show a notification for follow-ups scheduled for today (enabled by default).",
  },
  {
    key: "overdue",
    label: "Overdue follow-ups",
    description: "Show a notification for outstanding follow-ups scheduled before today (optional).",
  },
  {
    key: "upcoming",
    label: "Upcoming follow-ups",
    description: "Show a notification for outstanding follow-ups scheduled after today (optional).",
  },
];

/** Old or partial settings get stable defaults without requiring a migration. */
export function parseFollowUpNotificationPreferences(
  value: unknown,
): FollowUpNotificationPreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES };
  }

  const preferences = value as Record<string, unknown>;
  return {
    dueToday:
      typeof preferences.dueToday === "boolean"
        ? preferences.dueToday
        : DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES.dueToday,
    overdue:
      typeof preferences.overdue === "boolean"
        ? preferences.overdue
        : DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES.overdue,
    upcoming:
      typeof preferences.upcoming === "boolean"
        ? preferences.upcoming
        : DEFAULT_FOLLOW_UP_NOTIFICATION_PREFERENCES.upcoming,
  };
}

export function validateFollowUpNotificationPreferences(
  value: unknown,
): FollowUpNotificationPreferences | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const preferences = value as Record<string, unknown>;
  if (
    typeof preferences.dueToday !== "boolean" ||
    typeof preferences.overdue !== "boolean" ||
    typeof preferences.upcoming !== "boolean"
  ) {
    return null;
  }

  return {
    dueToday: preferences.dueToday,
    overdue: preferences.overdue,
    upcoming: preferences.upcoming,
  };
}

export function buildFollowUpNotificationItems(
  counts: FollowUpNotificationCounts,
  preferences: FollowUpNotificationPreferences,
): FollowUpNotificationItem[] {
  const items: FollowUpNotificationItem[] = [];

  if (preferences.dueToday && counts.dueToday > 0) {
    items.push({
      type: "dueToday",
      count: counts.dueToday,
      message: getFollowUpsDueTodayMessage(counts.dueToday),
    });
  }
  if (preferences.overdue && counts.overdue > 0) {
    items.push({
      type: "overdue",
      count: counts.overdue,
      message: `You have ${counts.overdue} overdue follow-up${counts.overdue === 1 ? "" : "s"}.`,
    });
  }
  if (preferences.upcoming && counts.upcoming > 0) {
    items.push({
      type: "upcoming",
      count: counts.upcoming,
      message: `You have ${counts.upcoming} upcoming follow-up${counts.upcoming === 1 ? "" : "s"}.`,
    });
  }

  return items;
}

export function hasEnabledFollowUpNotifications(
  preferences: FollowUpNotificationPreferences,
): boolean {
  return Object.values(preferences).some(Boolean);
}
