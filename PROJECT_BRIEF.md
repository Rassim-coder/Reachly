# Reachly — Project Brief

## 1. Product Overview

Reachly is a B2B business prospecting and lightweight CRM SaaS. It helps freelancers, agencies, and sales professionals find potential business clients, organize leads, manage outreach, and track follow-ups in one place.

The main goal is to reduce the time spent discovering businesses and manually organizing prospecting activities.

Reachly is not a marketplace. It does not make calls or record conversations. Users contact businesses externally through channels such as phone, email, or WhatsApp and track their own activity in Reachly.

### Target users

- Freelancers looking for potential clients.
- Web development and digital marketing agencies.
- Sales professionals and small sales teams.
- Users prospecting businesses in international markets, including Europe.

## 2. Core User Workflow

1. Search for businesses by niche and location.
2. Review business information and available contact details.
3. Save selected businesses as personal leads.
4. Contact businesses outside the application.
5. Record notes and update lead statuses.
6. Schedule and complete follow-ups.
7. Review prospecting activity and performance through the dashboard.

The first major milestone is a complete working workflow:

**Search businesses → Save a lead → View it in My Leads → Record activity → Schedule a follow-up.**

## 3. Technology Stack

### Planned stack

- **Frontend:** Next.js App Router, React, TypeScript.
- **Database:** Supabase PostgreSQL.
- **Authentication:** Supabase Auth.
- **Business discovery:** Overture Maps.
- **Query engine:** DuckDB querying cloud-hosted GeoParquet data.
- **Deployment:** To be confirmed after testing DuckDB and remote GeoParquet compatibility with the selected hosting environment.

### Current repository status

The repository now contains the Next.js application, Supabase authentication,
server-side Overture search, CRM workflows, and dashboard features described
below. Treat feature-specific notes in §6 and `docs/development.md` as the
implementation status. Local unit/build checks do not prove authenticated
database isolation or production-host compatibility; do not confuse code
presence with end-to-end verification.

## 4. Business Discovery with Overture Maps

Overture Maps is the planned primary source for discovering businesses.

### Intended search flow

User enters a niche and location → Next.js server-side endpoint → location resolution and category matching → DuckDB query against Overture GeoParquet → result normalization → dashboard results table.

### Data handling principles

- Query the source on demand instead of bulk-importing the entire dataset.
- Do not persist every search result automatically.
- Save a business record when a user chooses to save it as a lead.
- Keep user-specific lead information separate from general business information.
- Normalize missing contact information as `null`.
- Validate all search inputs on the server.
- Apply sensible result limits and pagination where appropriate.

### Items requiring verification

- Exact Overture release and schema.
- Category taxonomy and niche-to-category mapping.
- Geographic resolution and filtering strategy.
- DuckDB remote file access and query behavior.
- Search performance and resource consumption.
- Pagination strategy and maximum result count.
- Hosting runtime, memory limits, and request timeouts.
- Availability and reliability of phone numbers, websites, and email addresses.

Do not invent benchmark results or assume every business record contains complete contact information.

An existing DuckDB prototype may exist outside the current repository. Locate and inspect it before replacing or rewriting any working implementation.

## 5. Planned Database Model

The proposed Supabase schema includes the following tables:

| Table | Purpose |
|---|---|
| `profiles` | User profile and prospecting preferences |
| `businesses` | Normalized business records from the discovery source |
| `leads` | A user's saved businesses, status, and follow-up date |
| `lead_activities` | Notes and lead activity history |
| `lists` | Optional user-created lead lists |
| `list_leads` | Association between leads and lists |
| `message_templates` | Optional reusable outreach templates |

The SQL schema must be reviewed and applied through a tracked migration. Do not assume it has already been applied.

### Security requirements

- Enable Row Level Security (RLS) on user-specific tables.
- Users must only access their own leads, activities, lists, and templates.
- Protect shared business records against unauthorized client-side writes.
- Never expose the Supabase service-role key in browser code.
- Validate ownership and authorization on server-side operations.
- Test isolation between different user accounts.

### Important data relationships

- A business can be saved by multiple users.
- A user should not have duplicate lead records for the same business.
- Notes and activity records must belong to the appropriate user's lead.
- Lists must contain only leads owned by the same user.
- Follow-up information must be tied to persistent lead data, not hard-coded UI tasks.

## 6. Dashboard and Feature Status

The dashboard is organized into three main navigation groups: Prospecting, Organize, and Assistant, with Settings as a separate section.

The following status reflects the supplied dashboard specification. It describes the current UI behavior and missing functionality; it does not establish that any backend has been implemented.

### Prospecting

#### 6.1 Overview

**Implemented from persisted, user-owned data**
- Welcome banner and KPI cards for all-time Leads Saved, Contacted marked in the last 7 days, current Interested Leads, and current Follow-ups Due.
- Monthly Leads Over Time chart with a working Saved/Contacted toggle. Contacted uses recorded status-change activities, not current status as historical data.
- Recent Leads, Pipeline by the supported lead statuses, next outstanding Follow-ups, and Leads by Niche.

The Overview uses server-side authenticated queries and renders empty/error states without sample records. Contacted status-history writes are best-effort and may undercount; external outreach delivery and replies are not tracked by the current schema.

#### 6.2 Find Businesses

**Implemented in the repository:** server-side Overture search with validated
niche/location input, normalized optional contact data, keyset pagination,
reload-safe temporary result restoration, filters, and single/bulk lead saving.
Search results are not persisted unless the user explicitly saves them.

**Not verified for deployment:** Overture release availability, remote DuckDB
runtime/memory/timeout behavior on the selected host, and authenticated browser
search/save with test accounts.

#### 6.3 My Leads

**Implemented in the repository:** owner-scoped persistent lead list with filters,
sorting and pagination; lead details/activity; status and note updates; follow-up
dates; and page-scoped bulk status, follow-up, and delete actions. Editing saved
business/contact fields remains unfinished. Authenticated database workflows
and cross-account isolation still require integration verification.

#### 6.4 Follow-ups

**Implemented in the repository:** follow-ups use the existing single
`next_follow_up_date` per lead; the queue groups overdue, today, and upcoming
items, supports scheduling/rescheduling/clearing/completion, and derives the
dashboard notification from persisted data. Multiple pending follow-ups per lead
are not supported by the current schema. Database behavior still needs
authenticated integration tests.

### Organize

#### 6.5 Lists

**Implemented in the repository:** users can create, rename, and delete their
own lists, open lists, and add/remove owned leads. Counts come from persisted
memberships. Database authorization and full browser flows remain unverified.

#### 6.6 Analytics

**Implemented from real records**
- Current-state cards for leads saved, currently marked contacted, currently interested, and follow-ups due.
- A page-level 7/30/90-day UTC range shared by the Leads Over Time and Outreach Activity charts; buckets are daily for 7/30 days and weekly for 90 days.
- Outreach Activity stacked bars, current status distribution donut, and top niches horizontal bars.
- KPI cards, status distribution, and niche breakdown remain all-time/current-state values, independent of the selected historical range.

**Data limitations**
- Contacted and interested activity uses timestamped `status_change` history. It represents leads marked with those statuses, not verified calls, emails, or message delivery; failed activity inserts can undercount.
- Replies, reply rate, average reply time, and deals won are not represented by the current schema and are not displayed.

The Analytics page uses server-side, owner-scoped queries and sends only aggregated chart data to the browser.

#### 6.7 Templates

**Implemented:** authenticated users can create, edit, duplicate, delete, and
use email and WhatsApp templates. The editor supports safe lead placeholders
and AI-generated drafts; generated text is reviewed and edited before use.
AI generation uses the server-side Groq configuration and per-user daily
limits held in server memory; no database changes are needed.

### Assistant

#### 6.8 AI Assistant

**Implemented — AI Sales Assistant**
- Conversational chat with session-only history and suggested questions.
- Uses the signed-in user's prospecting preferences, exact lead-status counts,
  and up to 100 recent leads to help analyze the pipeline and suggest next steps.
- Requests explicit confirmation once at the start of each discussion before
  sending the chat and selected Reachly context to Groq; the consent is
  remembered for that chat session.
- Excludes lead notes and contact details from Groq requests.
- Keeps the AI explanation separate from the source CRM data; the model cannot
  run queries or modify leads.
- Configure Groq server-side with `GROQ_API_KEY`; see `docs/development.md`.

**Still missing**
- Lead qualification, outreach drafting, reply handling, and configurable
  language/tone options.
- Usage and cost tracking.

### Settings

**Implemented in the repository:** profile name and notification preferences
persist for the authenticated user; appearance is stored locally. Notification
preferences affect which real follow-up groups appear in the dashboard bell.
Cross-session persistence and ownership still require integration verification.

## 7. MVP Scope and Priorities

### Phase 1 — Foundation

- Review the repository and confirm the application structure.
- Add project documentation and coding-agent instructions.
- Review the SQL schema and create tracked database migrations.
- Define the search API contract and normalized business type.
- Inspect the existing DuckDB prototype, if available.

### Phase 2 — Real business search

- Implement server-side Overture queries.
- Implement location resolution and category matching.
- Validate results against real locations and niches.
- Add loading, empty, and error states.
- Verify performance and deployment constraints.

### Phase 3 — Lead CRM

- Configure authentication and RLS.
- Save businesses as leads.
- Prevent duplicate saves.
- Display persistent leads in My Leads.
- Add statuses, notes, and lead details.

### Phase 4 — Follow-ups and dashboard data

- Implement date-based follow-ups.
- Update completion state and badge counts.
- Calculate overview metrics from real records.
- Track the activity required for analytics.

### Phase 5 — Organization and preferences

- Implement lists.
- Implement reusable message templates.
- Persist user settings.
- Integrate these features with the lead workflow.

### Phase 6 — Quality and deployment

- Test authorization and data isolation.
- Test search accuracy and performance.
- Verify deployment compatibility.
- Improve responsive behavior and accessibility.
- Test the complete workflow with realistic usage.

### Phase 7 — AI features

- Lead qualification or scoring.
- Business summaries.
- Outreach message drafts.
- Language and tone options.
- Follow-up suggestions.

AI features are not required for the first working MVP.

## 8. Team Collaboration

The project may be developed by two contributors.

**Backend and data responsibilities**
- Overture/DuckDB integration.
- Search API and normalization.
- Supabase schema, authorization, and lead persistence.
- Search testing and deployment validation.

**Frontend responsibilities**
- Dashboard components and responsive layout.
- Search form and results table.
- Lead pipeline, filters, and detail views.
- Loading, empty, success, and error states.
- Integration with agreed API contracts.

Both contributors must agree on shared types and API contracts before integration. Use Git branches and review changes before merging into the main branch.

These are proposed ownership boundaries and can be adjusted by the team.

## 9. Development Principles

- Keep the codebase maintainable without overengineering.
- Use TypeScript and explicit types at API boundaries.
- Separate presentation, data access, and business logic where appropriate.
- Keep Overture/DuckDB queries on the server.
- Validate input and enforce authorization on server-side operations.
- Never expose secrets to the client.
- Avoid unnecessary dependencies.
- Preserve working code and inspect existing files before changing them.
- Write tests for critical data and security behavior.
- Document architectural decisions and important limitations.
- Mark assumptions as unverified until tested.
- Never describe a mock feature as implemented backend functionality.

## 10. Status Terminology

Use these labels consistently in project documentation:

- **Implemented:** Present in the repository and verified.
- **UI-only:** A visible interface exists, but real data or backend behavior is absent.
- **Hard-coded:** Values or records are fixed in code or mock data.
- **Proposed:** A design or decision awaiting approval.
- **TODO:** Work remains to be done.
- **Not verified:** Implementation or behavior has not been tested.

## 11. Current Status Summary

**Implemented in the repository:** Supabase authentication, Overture/DuckDB
search code, lead persistence and CRM actions, lists, templates, settings,
follow-ups, Overview, Analytics, and AI routes.

**Not yet verified or unfinished:** authenticated multi-user/RLS integration
tests, browser end-to-end workflows, selected-host Overture/DuckDB compatibility,
production deployment, saved business/contact editing, multiple follow-ups per
lead, and AI usage/cost tracking. See `docs/testing.md` and `docs/roadmap.md` for
verification gaps.

## 12. Instructions for Coding Agents

Before implementing a feature:

1. Read this brief and the relevant documentation.
2. Inspect the existing code.
3. Identify dependencies and agree on the smallest appropriate change.
4. Preserve working behavior and existing prototypes.
5. Implement and test the feature.
6. Update documentation when architecture, API contracts, or feature status changes.
7. Report what changed, what was tested, and what remains unverified.

Do not implement the entire application in one pass. Build and verify one end-to-end workflow at a time.
