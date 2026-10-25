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

Continuation requests send the same niche and location plus the opaque `cursor` returned by the previous response:

```json
{
  "niche": "dentists",
  "location": "Paris, France",
  "cursor": "eyJ2IjoxLCJyIjoiMjAyNi0xMC0yMS4wIiwiYiI6Wy..."
}
```

Cursors are server-issued, decoded and validated on the server, and rejected with `400 VALIDATION_ERROR` if malformed or issued for a different Overture release. They are not secret and carry no user data.

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

The example business is illustrative, not a real search result. Rows without a business name are dropped; optional values are `null`, never invented. `nextCursor` is an opaque string when another batch may exist, or `null` when the last batch has been returned. The response never includes a total-match count.

### Current behavior (verified 2026-10-23)

- Each request returns at most 50 normalized results. `nextCursor` is non-null when Overture returned at least one row beyond the page; it is `null` once the final batch is reached.
- Pagination uses keyset ordering on Overture's unique place `id` (`ORDER BY id`, `id > lastId`), so batches cannot overlap or skip rows even though the remote scan is parallel and unordered.
- Continuation requests reuse the resolved bounding box and matched categories stored in the cursor. This skips the divisions lookup and the distinct-category scan; the remote places scan inside the bbox is still required for every batch.
- Success returns real Overture release `2026-10-21.0` records (`taxonomy.primary`); a JSON header `X-Overture-Release` echoes the pinned release.
- Validation failures return `400 VALIDATION_ERROR`; an unknown city returns `404 NOT_FOUND`; timeouts return `504 SEARCH_FAILED`; other query failures return `500 SEARCH_FAILED`.
- `/api/*` is session-protected by `proxy.ts`, so an unauthenticated request receives a `307` redirect to `/login` rather than a JSON body.
- Live search is slow (~4–66 s per batch observed); the API applies a 120-second application-level timeout per request, which is not a hosting-platform guarantee.

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

### Saving — implemented server actions

Saving is implemented with authenticated Server Actions in `features/leads/actions.ts`, not with the HTTP endpoints below:

- `saveBusinessAsLead(business)` saves one search result.
- `saveBusinessesAsLeads(businesses)` saves an explicit user selection (up to 500 per request, chunked server-side).

Both actions derive the user from the session and re-validate every field. They call the authenticated `save_businesses_as_leads` RPC, which is proposed in `docs/sql/save_lead_function.sql` and must be applied manually before saving works. The function inserts a business only when `(source, source_id)` is unused, never updates an existing shared business, and relies on `unique (user_id, business_id)` for duplicate prevention. The bulk action reports added, already-existing, and failed counts separately; failures keep the selection available for retry. The service-role client is no longer used for saving. No RLS policy is bypassed for user-owned data.

### My Leads reads and mutations — implemented server actions

The current UI uses authenticated Server Actions instead of the proposed HTTP routes:

- `loadMyLeads(filters)` returns the filtered, sorted, paginated list and total count.
- `loadLeadDetails(leadId)` returns one owned lead with its 50 most recent activities.
- `updateLeadStatus`, `updateLeadFollowUp`, and `completeLeadFollowUp` mutate one owned lead and record compatible activities.
- `addLeadNote` appends a note owned by the authenticated user.
- `bulkUpdateLeadStatus(leadIds, status)` applies one real `lead_status` value to the selection.
- `bulkUpdateLeadFollowUp(leadIds, date | null)` sets or clears the existing single follow-up date.
- `bulkDeleteLeads(leadIds)` deletes only the caller's `leads` rows.

Bulk actions accept at most 100 submitted ids per request and deduplicate valid UUIDs before use. The server validates every id and value, derives ownership from the session, filters reads and writes by `user_id`, and still relies on RLS. Unchanged rows are skipped so they do not receive duplicate status or follow-up activities. Successful changes insert one batched activity array rather than one request per lead. Delete cascades the existing `lead_activities` and `list_leads` relationships, but never deletes shared `businesses` records.

Bulk results report a message, success/warning/error tone, requested count, affected ids, unchanged ids, and failed ids. A partial failure is reported as a warning and does not hide rows that were successfully changed. Network, authentication, validation, and database failures return an explicit error.

These actions and their ownership behavior remain unverified against an authenticated database session. Unit tests cover pure validation, planning, activity payloads, and result summaries only.

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

These routes are proposed, not implemented. The current My Leads UI uses
authenticated Server Actions for reads and mutations instead.

## 4. Lead Activities

Possible operations:
- List activities for a lead.
- Add a note.
- Record a status change.
- Record follow-up scheduling, clearing, or completion.

All operations must verify that the lead belongs to the authenticated user.

## 5. Follow-ups

The implementation must support:
- Listing upcoming and overdue follow-ups.
- Scheduling a follow-up.
- Rescheduling a follow-up.
- Clearing a scheduled follow-up.
- Completing a follow-up.

My Leads currently supports scheduling, changing, clearing, and completing the
single pending date per lead. A dedicated Follow-ups queue API is not implemented.
The data model decision about one date versus multiple tasks per lead remains open.

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