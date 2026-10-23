# Reachly — API Contracts

## 1. Status

These contracts are proposed unless an endpoint is explicitly marked **implemented**. Do not assume an endpoint exists until it has been implemented and verified.

The exact route names may change during implementation, but the frontend and backend must agree on request and response types.

## 2. Business Search

### Endpoint — implemented

`POST /api/businesses/search`

This is the single canonical search endpoint. `/api/search` does not exist.

### Request

```json
{
  "niche": "dentists",
  "location": "Paris, France"
}
```

`location` must be `"City, Country"` (split on the last comma). Niche is limited to 100 characters and location to 120.

### Response

```json
{
  "results": [
    {
      "sourceId": "example-source-id",
      "name": "Example Dental Clinic",
      "category": "dentist",
      "address": "Example address",
      "latitude": null,
      "longitude": null,
      "phone": null,
      "website": null,
      "email": null
    }
  ],
  "nextCursor": null
}
```

The example business is illustrative, not a real search result. Rows without a business name are dropped; optional values are `null`, never invented.

### Current behavior (verified 2026-10-23)

- Maximum 50 results per search; `nextCursor` is always `null` (pagination not implemented).
- Success returns real Overture release `2026-10-21.0` records (`taxonomy.primary`); a JSON header `X-Overture-Release` echoes the pinned release.
- Validation failures return `400 VALIDATION_ERROR`; an unknown city returns `404 NOT_FOUND`; timeouts return `504 SEARCH_FAILED`; other query failures return `500 SEARCH_FAILED`.
- `/api/*` is session-protected by `proxy.ts`, so an unauthenticated request receives a `307` redirect to `/login` rather than a JSON body.
- Live search is slow (~15–50 s observed); the API applies a 120-second application timeout, which is not a hosting-platform guarantee.

### Requirements

- Validate and limit niche and location inputs.
- Resolve the location and map the niche to supported categories on the server.
- Query Overture through the approved DuckDB implementation.
- Normalize missing optional values to `null`.
- Limit result counts and support pagination if required.
- Avoid returning an exact total unless it is calculated reliably.
- Return a clear error when the search cannot be completed.

The exact request fields may need to expand to support filters or pagination.

## 3. Saved Leads

### Proposed endpoint

`GET /api/leads`

Returns the authenticated user's leads, with pagination and supported filters.

### Proposed endpoint

`POST /api/leads`

Creates or retrieves a lead for a selected business.

The server must:
- Authenticate the user.
- Validate the business data.
- Resolve the source identifier.
- Prevent duplicate leads.
- Persist the business and lead safely.
- Record the initial activity if required by the approved workflow.

### Proposed endpoint

`GET /api/leads/:id`

Returns a lead and the permitted detail data for its owner.

### Proposed endpoint

`PATCH /api/leads/:id`

Updates permitted lead fields, such as status or follow-up date.

### Proposed endpoint

`DELETE /api/leads/:id`

Deletes a lead owned by the authenticated user, subject to the approved deletion and activity-retention behavior.

These routes are proposed, not implemented.

## 4. Lead Activities

Possible operations:
- List activities for a lead.
- Add a note.
- Record a status change.
- Record follow-up scheduling or completion.

All operations must verify that the lead belongs to the authenticated user.

## 5. Follow-ups

The implementation must support:
- Listing upcoming and overdue follow-ups.
- Scheduling a follow-up.
- Rescheduling a follow-up.
- Completing a follow-up.

The API design must be finalized after deciding whether one pending follow-up date per lead is sufficient or multiple tasks per lead are required.

## 6. Error Format

Use a consistent error response, for example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Provide a valid niche and location."
  }
}
```

Possible error codes:
- `VALIDATION_ERROR`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `SEARCH_FAILED`
- `INTERNAL_ERROR`

Do not expose secrets, raw stack traces, or sensitive database details to clients.

## 7. Authentication and Authorization

- Protected lead operations require authentication.
- Derive the acting user from the verified server-side session.
- Never trust a user ID provided in the request body as proof of ownership.
- Apply RLS as a second layer of protection.
- Validate ownership on reads, updates, and deletes.

## 8. TypeScript Types

Define shared types for:
- Search request.
- Normalized business search result.
- Paginated search response.
- Saved lead.
- Lead activity.
- Follow-up.
- Standard API error.

Keep frontend expectations aligned with the server implementation.

## 9. API Completion Criteria

An endpoint is complete only when its behavior, validation, authorization, error handling, and tests have been verified. Document any remaining limitations.