# Reachly — Development Roadmap

## Guiding Principle

Build one working end-to-end workflow at a time. A visual component is not complete until its intended behavior works and has been verified.

## Phase 0 — Project Foundation

Tasks:

- [ ] Review the initial Next.js repository.
- [x] Add and review project documentation.
- [x] Confirm the folder structure.
- [x] Agree on the normalized business type and search API contract.
- [x] Inspect and port the existing DuckDB prototype.
- [x] Confirm Git branches and contributor responsibilities.

Acceptance criteria:

- The repository structure is understood.
- Important decisions and unresolved questions are documented.
- Existing working code is preserved.

## Phase 1 — Database and Security

Tasks:

- [x] Review the hosted SQL schema and policies (the hosted database is the source of truth).
- [x] Configure authentication.
- [x] Enable RLS on user-owned tables and inspect hosted policies.
- [ ] Test user isolation with multiple accounts.

There are no active migrations. Do not restore or apply the archived baseline as
a substitute for inspecting the hosted project.

Acceptance criteria:

- Hosted schema and RLS policies match the documented application model.
- Users cannot access other users' protected records.
- Privileged credentials remain server-side.

## Phase 2 — Overture Search

Tasks:

- [ ] Inspect and preserve the existing prototype.
- [x] Confirm and pin the Overture release and schema.
- [x] Implement location resolution.
- [x] Implement niche-to-category mapping.
- [x] Query GeoParquet through DuckDB.
- [x] Normalize business results.
- [x] Add validation, limits, and error handling.
- [x] Test geographic/category cases and measure local performance.
- [ ] Validate deployment compatibility and resource limits on the selected host.

Acceptance criteria:

- Real businesses can be searched by niche and location.
- Results follow the agreed contract.
- Unsupported inputs and query failures are handled.
- Performance and deployment risks are documented.

## Phase 3 — Dashboard Search Integration

Tasks:

- [x] Replace fixed result rows with API data.
- [x] Connect the search form.
- [x] Add loading, empty, and error states.
- [x] Connect result selection and save actions.
- [ ] Test authenticated search/save end-to-end in the browser.

Acceptance criteria:

- Submitting a search displays real results.
- UI state accurately reflects API success and failure.
- No mock result is presented as a real Overture result.

## Phase 4 — Lead Management

Tasks:

- [x] Implement safe business persistence.
- [x] Save a business as a lead.
- [x] Prevent duplicate leads.
- [x] Display persisted leads in My Leads.
- [x] Implement the lead detail drawer.
- [x] Implement status changes.
- [x] Add notes and activity history.
- [x] Add page-scoped row selection and bulk status/follow-up updates.
- [x] Add confirmed, owner-scoped bulk lead deletion.
- [ ] Implement editing saved business/contact fields.

Acceptance criteria:

- A saved lead persists across page reloads.
- The same business cannot be duplicated for the same user.
- Lead operations enforce ownership.
- Notes and status changes are associated with the correct lead.
- Bulk actions affect only selected, visible, owned leads.
- Bulk deletion removes leads and dependent history without deleting shared
  business records.

## Phase 5 — Follow-ups

Tasks:

- [ ] Finalize whether one pending date per lead is sufficient.
- [x] Schedule and reschedule follow-ups.
- [x] Link follow-ups to leads.
- [x] Complete follow-ups.
- [x] Derive navigation notification counts from real data.
- [x] Display a dedicated Overdue, Today, and Upcoming queue.

Acceptance criteria:

- Dates and completion state persist.
- Follow-up groups and counts reflect real records.
- Users cannot modify another user's follow-ups.

## Phase 6 — Overview and Analytics

Tasks:

- [x] Define the meaning and formula of each implemented metric.
- [x] Connect the overview cards to real data.
- [x] Connect Recent Leads, Pipeline, Follow-ups Due, and Leads by Niche panels
  on the Overview page.
- [x] Connect Analytics pipeline, status distribution, and Leads by Niche.
- [x] Connect the Leads Over Time and Outreach Activity charts.
- [x] Add 7/30/90-day Leads Over Time filters.
- [ ] Define how replies and deals won are recorded.

Acceptance criteria:

- Metrics derive from actual records.
- Empty datasets are handled correctly.
- Metrics with insufficient underlying data are not fabricated.
- Chart filters produce consistent results.

## Phase 7 — Lists, Templates, and Settings

Tasks:

- [x] Create and manage lists.
- [x] Add and remove leads from lists.
- [x] Calculate list counts from persisted memberships.
- [x] Create, edit, and delete templates.
- [x] Implement template placeholder substitution.
- [x] Persist user settings.
- [x] Apply notification preferences to the dashboard bell.

Acceptance criteria:

- Changes persist across reloads.
- Ownership rules are enforced.
- Template substitution handles missing values safely.

## Phase 8 — Quality and Deployment

Tasks:

- [ ] Test authentication and RLS.
- [ ] Test search performance and resource limits.
- [ ] Test duplicate-save and failure scenarios.
- [ ] Verify DuckDB and GeoParquet compatibility on the selected host.
- [ ] Test responsive layouts and accessibility.
- [ ] Configure production environment variables.
- [ ] Deploy and run end-to-end smoke tests.

Acceptance criteria:

- The core workflow works in the deployed environment.
- Critical security and data integrity tests pass.
- Known limitations are documented.

## Phase 9 — AI Assistant

Tasks:

- [x] Choose an initial AI use case: conversational, read-only sales assistance.
- [x] Implement server-side Groq model access.
- [x] Add personalized lead analysis and next-step recommendations using the
  user's prospecting preferences and recent CRM records.
- [x] Add session-only conversation history and one-time context consent per
  discussion.
- [ ] Add lead qualification or outreach drafting.
- [ ] Add language and tone options if needed.
- [x] Add validation, provider failure handling, and unit tests for metric calculations.
- [ ] Track usage and costs.

Acceptance criteria:

- AI features use real backend integration.
- Model credentials are never exposed to the client.
- Database figures are calculated server-side, with the AI explanation clearly
  separated from verified facts.

## Immediate Next Step

Complete the outstanding Phase 8 verification: test authenticated flows and
RLS isolation in an isolated database, then verify the Overture/DuckDB workload
on the selected production host before deployment.

Do not begin every phase simultaneously. Reassess the roadmap as each milestone is verified.
