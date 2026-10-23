/**
 * Shapes shared between the search API and its consumers.
 *
 * These mirror `docs/API.md`. They are contracts only — nothing here performs
 * I/O, and no endpoint exists yet.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SEARCH_FAILED"
  | "INTERNAL_ERROR";

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export type BusinessSearchRequest = {
  niche: string;
  location: string;
  /**
   * Opaque continuation cursor from a previous `BusinessSearchResponse`.
   * Omit it for the first page.
   */
  cursor?: string | null;
};

/**
 * A business record normalized from the discovery source.
 * Optional values are `null`, never invented or defaulted to a string.
 */
export type NormalizedBusiness = {
  sourceId: string;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
};

export type BusinessSearchResponse = {
  results: NormalizedBusiness[];
  /** Opaque cursor for the next page, or `null` when there are no more results. */
  nextCursor: string | null;
};
