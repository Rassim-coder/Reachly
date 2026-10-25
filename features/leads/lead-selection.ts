/**
 * Pure selection helpers for the My Leads table.
 *
 * Selection is intentionally scoped to the rows currently visible on the page.
 * These helpers make that rule explicit and testable without a browser.
 */

export type PageSelectionState = "none" | "some" | "all";

export function toggleSelectedLead(
  selected: ReadonlySet<string>,
  leadId: string,
): Set<string> {
  const next = new Set(selected);

  if (next.has(leadId)) {
    next.delete(leadId);
  } else {
    next.add(leadId);
  }

  return next;
}

/**
 * Selects exactly the current page or removes every current-page id. It never
 * expands a page selection to every matching lead across pagination.
 */
export function setPageSelection(
  selected: ReadonlySet<string>,
  pageIds: readonly string[],
  checked: boolean,
): Set<string> {
  if (checked) {
    return new Set(pageIds);
  }

  const pageIdSet = new Set(pageIds);
  return new Set([...selected].filter((id) => !pageIdSet.has(id)));
}

/** Drops selected ids that are no longer present in the latest result page. */
export function pruneSelection(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  const visibleIdSet = new Set(visibleIds);
  return new Set([...selected].filter((id) => visibleIdSet.has(id)));
}

/** Removes explicit ids, used immediately after a successful delete. */
export function deselectIds(
  selected: ReadonlySet<string>,
  ids: readonly string[],
): Set<string> {
  if (ids.length === 0) return new Set(selected);

  const removed = new Set(ids);
  return new Set([...selected].filter((id) => !removed.has(id)));
}

export function getPageSelectionState(
  selected: ReadonlySet<string>,
  pageIds: readonly string[],
): PageSelectionState {
  if (pageIds.length === 0) return "none";

  let selectedOnPage = 0;
  for (const id of pageIds) {
    if (selected.has(id)) selectedOnPage += 1;
  }

  if (selectedOnPage === 0) return "none";
  return selectedOnPage === pageIds.length ? "all" : "some";
}
