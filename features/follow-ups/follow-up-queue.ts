import {
  getLeadFollowUpState,
  todayDateString,
  type LeadListItem,
} from "../leads/lead-list.ts";

/**
 * Pure grouping for the Follow-ups queue.
 *
 * `leads.next_follow_up_date` is a date-only column. All comparisons use the
 * same normalized YYYY-MM-DD strings as the existing My Leads helpers, so a
 * lead is never shifted into another day by a timezone conversion.
 */

export type FollowUpNote = {
  body: string;
  createdAt: string;
};

export type FollowUpItem = LeadListItem & {
  latestNote: FollowUpNote | null;
};

export type FollowUpSections<T extends LeadListItem> = {
  overdue: T[];
  today: T[];
  upcoming: T[];
  counts: {
    overdue: number;
    today: number;
    upcoming: number;
  };
  total: number;
};

export type FollowUpQueue = FollowUpSections<FollowUpItem>;

function compareFollowUps(a: LeadListItem, b: LeadListItem): number {
  const aDate = a.nextFollowUpDate ?? "";
  const bDate = b.nextFollowUpDate ?? "";

  if (aDate !== bDate) return aDate < bDate ? -1 : 1;

  const aName = a.businessName.toLowerCase();
  const bName = b.businessName.toLowerCase();

  if (aName !== bName) return aName < bName ? -1 : 1;

  return a.id.localeCompare(b.id);
}

/**
 * Splits scheduled leads into the three queue sections and sorts every section
 * from the earliest date to the latest. Leads without a valid scheduled date
 * are omitted, so one lead cannot appear in more than one section.
 */
export function groupFollowUps<T extends LeadListItem>(
  leads: readonly T[],
  today: string = todayDateString(),
): FollowUpSections<T> {
  const overdue: T[] = [];
  const todayItems: T[] = [];
  const upcoming: T[] = [];

  for (const lead of leads) {
    switch (getLeadFollowUpState(lead.nextFollowUpDate, today)) {
      case "overdue":
        overdue.push(lead);
        break;
      case "today":
        todayItems.push(lead);
        break;
      case "upcoming":
        upcoming.push(lead);
        break;
      default:
        break;
    }
  }

  overdue.sort(compareFollowUps);
  todayItems.sort(compareFollowUps);
  upcoming.sort(compareFollowUps);

  return {
    overdue,
    today: todayItems,
    upcoming,
    counts: {
      overdue: overdue.length,
      today: todayItems.length,
      upcoming: upcoming.length,
    },
    total: overdue.length + todayItems.length + upcoming.length,
  };
}
