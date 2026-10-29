# Reachly — Development Roadmap

## Guiding Principle

Build one working end-to-end workflow at a time. A visual component is not complete until its intended behavior works and has been verified.

## Phase 0 — Project Foundation

Tasks:

- [ ] Review the initial Next.js repository.
- [ ] Add and review project documentation.
- [ ] Confirm the folder structure.
- [ ] Agree on the normalized business type and proposed search API contract.
- [ ] Inspect the existing DuckDB prototype, if available.
- [ ] Confirm Git branches and contributor responsibilities.

Acceptance criteria:

- The repository structure is understood.
- Important decisions and unresolved questions are documented.
- Existing working code is preserved.

## Phase 1 — Database and Security

Tasks:

- [ ] Review the prepared SQL schema.
- [ ] Set up the development Supabase project.
- [ ] Apply a tracked migration.
- [ ] Configure authentication.
- [ ] Enable and test RLS.
- [ ] Test user isolation with multiple accounts.

Acceptance criteria:

- Migrations apply successfully.
- Users cannot access other users' protected records.
- Privileged credentials remain server-side.

## Phase 2 — Overture Search

Tasks:

- [ ] Inspect and preserve the existing prototype.
- [ ] Confirm the Overture release and schema.
- [ ] Implement location resolution.
- [ ] Implement niche-to-category mapping.
- [ ] Query GeoParquet through DuckDB.
- [ ] Normalize business results.
- [ ] Add validation, limits, and error handling.
- [ ] Test geographic and category accuracy.
- [ ] Benchmark performance.
- [ ] Validate deployment compatibility.

Acceptance criteria:

- Real businesses can be searched by niche and location.
- Results follow the agreed contract.
- Unsupported inputs and query failures are handled.
- Performance and deployment risks are documented.

## Phase 3 — Dashboard Search Integration

Tasks:

- [ ] Replace the six fixed result rows with API data.
- [ ] Connect the search form.
- [ ] Add loading, empty, and error states.
- [ ] Connect result selection and save actions.
- [ ] Test the workflow in the browser.

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
- [ ] Derive navigation badge counts from real data.
- [x] Display a dedicated Overdue, Today, and Upcoming queue.

Acceptance criteria:

- Dates and completion state persist.
- Follow-up groups and counts reflect real records.
- Users cannot modify another user's follow-ups.

## Phase 6 — Overview and Analytics

Tasks:

- [x] Define the meaning and formula of each implemented metric.
- [x] Connect the overview cards to real data.
- [ ] Connect Recent Leads, Pipeline, Follow-ups Due, and Leads by Niche panels
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

- [ ] Create and manage lists.
- [ ] Add and remove leads from lists.
- [ ] Calculate list counts and progress.
- [ ] Create, edit, and delete templates.
- [ ] Implement template placeholder substitution.
- [ ] Persist user settings.
- [ ] Apply saved preferences to relevant workflows.

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

- [ ] Choose an initial AI use case.
- [ ] Implement server-side model access.
- [ ] Add lead qualification or outreach drafting.
- [ ] Add language and tone options if needed.
- [ ] Evaluate output quality and failure handling.
- [ ] Track usage and costs.

Acceptance criteria:

- AI features use real backend integration.
- Model credentials are never exposed to the client.
- Generated suggestions are clearly distinguished from verified facts.

## Immediate Next Step

Complete Phase 0, then prioritize the search service and agree on its API contract so frontend work can proceed with fixtures in parallel.

Do not begin every phase simultaneously. Reassess the roadmap as each milestone is verified.
