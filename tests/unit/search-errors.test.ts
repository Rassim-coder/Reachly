import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getSearchFailureMessage,
  getSearchNetworkFailureMessage,
} from "../../features/businesses/search-errors.ts";
import type { ApiError } from "../../types/api.ts";

function apiError(code: ApiError["error"]["code"], message: string): ApiError {
  return { error: { code, message } };
}

describe("business search user-facing errors", () => {
  test("does not expose raw provider diagnostics for Load more failures", () => {
    const message = getSearchFailureMessage(
      apiError(
        "SEARCH_FAILED",
        "IO Error: could not establish connection to s3://internal/path",
      ),
      "load_more",
      500,
    );

    assert.equal(
      message,
      "More businesses couldn't be loaded right now. Your current results are unchanged—please try again shortly.",
    );
    assert.doesNotMatch(message, /IO Error|s3:\/\//i);
  });

  test("provides distinct friendly messages for initial and continuation failures", () => {
    const failed = apiError("SEARCH_FAILED", "internal DuckDB details");

    assert.equal(
      getSearchFailureMessage(failed, "initial", 500),
      "Business search is temporarily unavailable. Please try again shortly.",
    );
    assert.match(
      getSearchNetworkFailureMessage("load_more"),
      /current results are unchanged.*try Load more/i,
    );
  });

  test("preserves safe validation feedback but makes stale cursors actionable", () => {
    assert.equal(
      getSearchFailureMessage(
        apiError("VALIDATION_ERROR", "Provide a business niche."),
        "initial",
        400,
      ),
      "Provide a business niche.",
    );
    assert.match(
      getSearchFailureMessage(
        apiError("VALIDATION_ERROR", "Raw cursor details"),
        "load_more",
        400,
      ),
      /Start a new search/,
    );
  });

  test("uses user-safe location and session messages", () => {
    assert.match(
      getSearchFailureMessage(
        apiError("NOT_FOUND", "Raw provider location details"),
        "initial",
        404,
      ),
      /Check the city and country/,
    );
    assert.match(
      getSearchFailureMessage(null, "initial", 401),
      /session may have expired/i,
    );
  });
});
