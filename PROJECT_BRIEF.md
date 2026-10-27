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

The repository currently contains only the initial Next.js setup. The application features described in this document are not confirmed to be implemented.

The database schema, dashboard design, folder structure proposal, and Overture implementation prompt have been prepared separately. They must be reviewed and incorporated into the repository before implementation.

Do not confuse planned architecture with working code.

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

**Currently works in the UI**
- Greeting banner.
- Four stat cards: Leads Saved, Contacted, Replies, Follow-ups Due.
- Leads Over Time chart with Saved/Contacted toggle and hover tooltips.
- Display-only Recent Leads, Pipeline bar, Follow-ups Due list, and Leads by Niche.

**Missing**
- Statistics are not calculated from real lead data.

#### 6.2 Find Businesses

**Currently works in the UI**
- Editable niche and location fields.
- Results table with a Save lead button that changes to Saved.

**Missing**
- Search button does nothing.
- The table contains six fixed rows.
- Saving does not add a lead to My Leads.

**Target behavior**
- Search the real Overture dataset.
- Display normalized business results.
- Allow users to save selected businesses as leads.
- Reflect saved state accurately.

#### 6.3 My Leads

**Currently works in the UI**
- Filter chips: All, New, Contacted, Replied, Follow-up.
- Table showing business, niche, location, status, last contact, and next follow-up.

**Missing**
- Add lead does nothing.
- No editing, deleting, status changes, notes, or lead detail page.

**Target behavior**
- Display persistent leads belonging to the authenticated user.
- Support lead details, status changes, notes, and appropriate edit/delete actions.

#### 6.4 Follow-ups

The current navigation badge displays 8.

**Currently works in the UI**
- Tasks grouped into Overdue, Today, and This week.
- Checkboxes strike through and fade completed tasks.

**Missing**
- Tasks are not linked to leads or actual dates.
- Completing a task does not update the badge.
- Users cannot add or reschedule tasks.

**Target behavior**
- Link follow-ups to persistent leads and dates.
- Support scheduling, rescheduling, and completion.
- Derive the badge from real follow-up data.

### Organize

#### 6.5 Lists

**Currently works in the UI**
- Four list cards.
- Lead count, last update, and contacted progress bar.

**Missing**
- New list and Open buttons do nothing.
- Leads cannot be added to or removed from lists.

**Target behavior**
- Allow users to create, open, and manage their own lists.
- Associate and remove their own leads from lists.
- Calculate counts and progress from real data.

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

**Currently works in the UI**
- Three message cards: WhatsApp intro, Email intro, Call script.
- Copy button.

**Missing**
- New template does nothing.
- Templates cannot be edited or deleted.
- Placeholders `{name}`, `{business}`, and `{city}` are not interpolated.

**Target behavior**
- Support reusable, user-owned templates.
- Allow create, edit, delete, and copy actions.
- Replace placeholders using available lead information.
- Handle missing placeholder values safely.

### Assistant

#### 6.8 AI Assistant

The navigation badge says Soon.

**Currently works in the UI**
- Preview containing an example lead score and sample draft message.
- Disabled action button.

**Missing**
- Lead scoring.
- Message drafting.
- Language and tone options.
- Reply handling.
- Backend integration with an AI model.

**Target behavior**
- Add AI capabilities only after the core search and CRM workflows are reliable.
- Start with one or two useful features, such as lead qualification and outreach drafting.
- Keep AI-generated suggestions distinguishable from verified business data.
- Do not claim to handle replies automatically unless a real integration is implemented.

### Settings

**Currently works in the UI**
- Editable name, target niches, target location, and what the user offers.
- Three notification checkboxes.
- Save changes button changes its label.

**Missing**
- Settings are not persisted.
- Other application features do not use these values.

**Target behavior**
- Persist settings for the authenticated user.
- Validate and load saved preferences.
- Use preferences in relevant workflows only when explicitly supported by implemented behavior.

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

**Known to exist**
- Initial Next.js setup.
- Prepared dashboard design and design prompt.
- Prepared database schema proposal.
- Prepared Overture implementation prompt.
- Proposed folder structure.
- Supplied description of dashboard UI behavior and missing features.

**Not confirmed as implemented**
- Supabase migrations and authentication.
- Overture/DuckDB integration.
- Real business search.
- Persistent lead management.
- Notes, follow-ups, lists, templates, and settings persistence.
- Dynamic analytics.
- AI backend.
- Production deployment.

The repository and actual project materials must be inspected before claiming that any of these features work.

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
