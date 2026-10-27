/** User-facing copy for the one grouped due-today notification. */
export function getFollowUpsDueTodayMessage(count: number): string {
  if (count <= 0) return "No follow-ups due today.";
  return `You have ${count} follow-up${count === 1 ? "" : "s"} due today.`;
}
