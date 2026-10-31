# Reachly

B2B business prospecting and lightweight CRM.

Find businesses by niche and location, save them as personal leads, record
notes and statuses, and schedule follow-ups — all in one place.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Row Level Security)
- Overture Maps queried server-side with DuckDB over remote GeoParquet (implemented; production-host compatibility still needs verification)

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in Supabase values; add GROQ_API_KEY to enable AI
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` – start the development server
- `pnpm build` – production build (also runs the type check)
- `pnpm start` – serve the production build
- `pnpm lint` – run ESLint
- `pnpm typecheck` – run TypeScript validation
- `pnpm test` – run offline unit tests

## Continuous integration

GitHub Actions runs lint, unit tests, and the production build on pushes to
`master` and pull requests targeting `master`. The workflow is defined in
`.github/workflows/ci.yml`.

## Documentation

| Document | Contents |
|---|---|
| `PROJECT_BRIEF.md` | Product overview, feature status, MVP phases |
| `docs/architecture.md` | Components, search and save-lead flows, folder structure |
| `docs/API.md` | Implemented and proposed API contracts and error format |
| `docs/database.md` | Applied schema, constraints, and RLS policies |
| `docs/overture_search.md` | Overture/DuckDB search design and test matrix |
| `docs/roadmap.md` | Phased delivery plan |
| `docs/development.md` | Local setup, Supabase CLI, and auth flow |
| `AGENTS.md` | Instructions for coding agents working in this repo |

## Status

Implemented in the repository: authenticated search, lead management, notes,
follow-ups, lists, templates, settings persistence, Overview, Analytics, and the
read-only AI sales assistant. AI features require a server-side `GROQ_API_KEY`;
chat also requires per-discussion context consent. See `docs/development.md`.

Automated tests are unit-level. Hosted RLS isolation, complete authenticated
workflows, email delivery, and Overture/DuckDB compatibility on the production
host have not been verified. The AI assistant cannot modify CRM data or run SQL.

See `PROJECT_BRIEF.md` §11 and `docs/roadmap.md` for the authoritative status.

# Reachly

**Find local businesses. Discover potential customers. Manage your leads.**

Reachly is a business prospecting and lightweight lead-management platform designed to help freelancers, agencies, and small sales teams discover local businesses and organize their outreach.

Instead of manually searching across multiple websites and keeping prospects in scattered spreadsheets, Reachly brings business discovery and lead management into one workflow.

> **Project status:** Deployed application with working business search powered by Overture Maps data.

<!-- Add your deployed application URL here -->
**Live application:** [Reachly](https://reachly-3b34.vercel.app/)
---

## The Problem

Finding potential clients is a recurring challenge for freelancers, independent developers, and small digital agencies.

When looking for businesses that might need their services, they often rely on manual Google Maps searches, opening business profiles one by one, and copying available information into spreadsheets.

As their prospect lists grow, spreadsheets become difficult to maintain. Tracking who has been contacted, recording conversations, managing lead statuses, and remembering follow-ups becomes increasingly messy.

The problem is not simply finding business information. It is the lack of an organized workflow connecting business discovery with prospect management.

## Problem Validation

Reachly originated from a problem experienced firsthand by its founder as a freelancer.

To validate the idea, we discussed prospecting workflows with other freelancers and developers, including developers working in companies who were interested in exploring the product.

These conversations revealed recurring difficulties:

- **Manual prospect discovery:** Searching Google Maps and reviewing businesses individually takes time.
- **Spreadsheet dependency:** Collecting and organizing prospects in spreadsheets becomes cumbersome.
- **Lack of tracking:** Keeping track of contacted businesses, notes, lead statuses, and follow-up dates is difficult.

These conversations reinforced our initial observation: discovering potential clients and managing the prospecting process are disconnected activities.

This feedback helped shape Reachly's core workflow: find businesses, save promising prospects, organize leads, and manage follow-ups in one workspace.

We plan to continue validating the product through hands-on testing with freelancers and small agencies, using their feedback to guide future improvements.

## The Solution

Reachly combines local-business discovery and lightweight lead management in one platform.

Users can search for businesses by niche and location, explore matching results, save promising prospects, organize them into lists, track their statuses, record notes, and manage follow-ups.

Instead of switching between manual searches and disconnected spreadsheets, users can manage their prospecting workflow from one workspace.

### Core Workflow

1. **Find businesses:** Search for businesses using a niche and geographic location.
2. **Review prospects:** Explore available business information and identify potential customers.
3. **Save leads:** Add interesting businesses to your personal lead workspace.
4. **Organize leads:** Group leads into custom lists, update their statuses, and record notes.
5. **Prepare outreach:** Create email and WhatsApp templates, or generate message drafts using AI.
6. **Follow up:** Schedule and track follow-up activities to stay on top of your prospects.
7. **Get AI assistance:** Use Reachly AI to get help organizing leads and follow-up activities.

## Features

### Business Discovery
- Search for businesses by niche and geographic location.
- Retrieve real business records using Overture Maps data.
- Query geographic business data through DuckDB.
- Display normalized business information in the dashboard.

### Lead Management
- Save discovered businesses as leads.
- Manage leads in a personal workspace.
- Track lead statuses.
- Record notes and outreach activity.

### Lists Management
- Create custom lists to organize leads.
- Add and remove leads from lists.
- Group prospects by niche, location, campaign, or personal workflow.
- Track the leads belonging to each list.

### Follow-up Management
- Schedule follow-ups for saved leads.
- Track upcoming and overdue follow-ups.
- Mark follow-ups as completed.
- Keep follow-up activities connected to their respective leads.

### AI-Powered Templates
- Create and manage email and WhatsApp templates.
- Generate outreach message templates using AI.
- Customize generated drafts for different prospects and communication needs.

### Reachly AI Assistant
- Chat with Reachly AI using natural language.
- Get assistance with organizing leads.
- Get help planning and managing follow-up activities.
- Use AI as a prospecting assistant within the Reachly workspace.

### Dashboard and Analytics
- View an overview of lead-management activity.
- Track lead statistics and visualizations.
- Monitor prospecting progress.
- Access important lead and follow-up information from one dashboard.

---

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js server-side functionality and API routes |
| Database | Supabase, PostgreSQL |
| Authentication | Supabase Auth |
| Business data | Overture Maps |
| Geospatial queries | DuckDB, GeoParquet |
| Charts | Recharts |
| Ai agent | Opencode |
| Package manager | pnpm |
| Deployment | Vercel |
| CI | GitHub Actions |

## Architecture

Reachly uses Next.js for its application interface and server-side functionality, with Supabase providing authentication and persistent data storage.

The business discovery workflow uses Overture Maps data stored in GeoParquet format. DuckDB is used to query this data and retrieve business records matching the user's search criteria.

The application then normalizes the search results and makes them available to the dashboard.

### Search workflow

```text
User
  |
  v
Search Form
  |
  v
Next.js Search API
  |
  v
DuckDB
  |
  v
Overture Maps GeoParquet
  |
  v
Normalized Business Results
  |
  v
Dashboard
  |
  v
Save as Lead
  |
  v
Supabase Database
```

---

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js (use the version configured for the project).
- pnpm.
- A Supabase project with the required database schema.

### 1. Clone the repository

```bash
git clone https://github.com/Rassim-coder/Reachly.git
cd Reachly
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=

# Optional: AI features
GROQ_API_KEY=
GROQ_MODEL=
```

Use the actual environment variable names and requirements documented in the project. Never commit `.env.local` or expose secret keys.

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run project checks

```bash
pnpm lint
pnpm test
pnpm build
```

---

## Continuous Integration

Reachly uses GitHub Actions to automatically check code changes.

The CI workflow runs on pushes to `master` and pull requests targeting `master`.

It performs three checks:

- ESLint for code quality.
- Automated tests.
- Production build verification.

This helps detect issues before changes are merged into the main branch.

---

## Team

Reachly was built by a three-person team, with each contributor taking ownership of different parts of the product.

### Racim Ait Said — Founder | Architecture, Backend & Core Product
- Designed the database schema and data model.
- Defined the application architecture.
- Designed the product interface alongside the team.
- Implemented business search using Overture Maps and DuckDB.
- Developed lead management functionality.
- Implemented follow-up management.
- Built the marketing landing page.

### Ines — AI Integration
- Integrated AI capabilities into Reachly.
- Developed the AI assistant chatbot.
- Implemented AI-powered template generation through the AI Write feature.
- Helped debug and improve application stability.

### Yasmine — Product Features & Quality
- Developed the lists management features.
- Developed the template management feature.
- Contributed to product design.
- Helped debug and improve application stability.
- Prepared the pitch presentation.

All three contributors collaborated on building and shaping Reachly.

---

## Future Improvements

We plan to continue improving Reachly in the following areas:

- **Better business data sources:** Integrate additional data sources to improve business information coverage, accuracy, and completeness.
- **Improved business search:** Enhance search relevance, category matching, and location-based results to help users find more suitable prospects.
- **Advanced prospecting analytics:** Introduce more detailed analytics to help users understand and measure their prospecting activity.
- **Expanded lead management:** Add more tools for managing leads, organizing workflows, and handling follow-ups.
- **Role-based access and features:** Introduce user roles with different permissions and capabilities, tailored to each role's responsibilities.
- **Improved AI assistant:** Make Reachly AI more useful for prospecting, lead organization, and follow-up workflows.

### Marketing Page and Monetization

- **Interactive product demo:** Add a demo link to the marketing page so visitors can explore how the dashboard works before signing up.
- **Paid subscription plans:** Introduce subscription tiers with features and limits adapted to different types of users.
- **Improved UI/UX:** Continue refining the marketing page and application interface to make Reachly easier to navigate and use.

---

## Acknowledgements

Reachly uses publicly available geographic business data from [Overture Maps](https://overturemaps.org/).

Built as part of the Thirduni program.

---

## Usage Notes

- **Email verification:** After signing up with your email address, check your inbox for a verification email and follow the instructions to complete the registration process. If you don't see it, check your spam or junk folder.
- **Business search:** Search results may occasionally fail to load. If this happens, try submitting the search again.
- **Search keywords:** Search quality depends on the keywords and location you enter. If you don't get relevant results, try using a different or more specific business category or keyword.

Reachly is still evolving, so you may occasionally encounter temporary issues while using the platform. Your feedback helps us improve it.

**Reachly — Make prospecting more organized.**




