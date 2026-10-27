import type { ApiError } from "@/types/api";

export type SearchRequestContext = "initial" | "load_more";

export function getSearchFailureMessage(
  error: ApiError | null,
  context: SearchRequestContext,
  status?: number,
): string {
  if (status === 401 || status === 403) {
    return "Your session may have expired. Sign in again, then retry the search.";
  }

  switch (error?.error.code) {
    case "VALIDATION_ERROR":
      return context === "load_more"
        ? "This search can no longer continue. Start a new search to load more businesses."
        : error.error.message;
    case "NOT_FOUND":
      return "We couldn't find a matching city. Check the city and country, then try again.";
    case "SEARCH_FAILED":
      return context === "load_more"
        ? "More businesses couldn't be loaded right now. Your current results are unchanged—please try again shortly."
        : "Business search is temporarily unavailable. Please try again shortly.";
    case "UNAUTHENTICATED":
      return "Your session may have expired. Sign in again, then retry the search.";
    case "FORBIDDEN":
      return "You don't have access to business search.";
    default:
      return context === "load_more"
        ? "More businesses couldn't be loaded right now. Your current results are unchanged—please try again shortly."
        : "Business search couldn't be completed. Please try again shortly.";
  }
}

export function getSearchNetworkFailureMessage(
  context: SearchRequestContext,
): string {
  return context === "load_more"
    ? "We couldn't connect to business search. Your current results are unchanged—check your connection and try Load more again."
    : "We couldn't connect to business search. Check your connection and try again.";
}
