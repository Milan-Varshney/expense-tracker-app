# HisabKitab — Documentation

HisabKitab is a local-only, single-user personal finance tracker built with React Native (Expo). This `/docs` folder is the complete reference for the project: what it does, why it's built the way it is, and how to run, test, extend, and maintain it.

**Read this first if you're new:** you do not need any prior context. Start with [01-project-overview.md](01-project-overview.md) and work down the list in order. Each file is self-contained but references related files where useful.

## A note on scope before you read further

The original request for this documentation set used a generic full-stack template (database tables, REST API endpoints, auth flow, household management, backend controllers/services). **This project doesn't have most of those things, on purpose.** It's a phase-1, local-only mobile app with no server and no database — see [ADR-expense-tracker-app.md](../ADR-expense-tracker-app.md) in the repo root for the original design decisions.

Rather than inventing endpoints or tables that don't exist, every doc below maps the requested topic onto what's actually in the codebase, and says so explicitly:

| You might be looking for... | It's covered in... | Because... |
|---|---|---|
| Database design / ER diagram | [05-data-model.md](05-data-model.md) | There's no database — transactions are a JSON array in `AsyncStorage`. The doc covers the data shape and its "relationships" (category, budget config) instead. |
| API documentation (endpoints, request/response) | [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md) | There's no server/REST API. The equivalent "API" is the internal Context + pure-function surface (`TransactionsContext`, `analytics.js`). Documented with full function signatures. |
| Backend architecture (controllers/services/models/middleware) | [03-architecture.md](03-architecture.md) and [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md) | There's no backend process. The closest analogues — data layer, business-logic layer, presentation layer — are mapped out. |
| Authentication and authorization | [14-security.md](14-security.md) | There's no login. It's a single-user local app; this is a deliberate v1 decision, explained in the security doc. |
| Household expense management | [17-future-improvements.md](17-future-improvements.md) | Not implemented. It's listed as a candidate future feature with a sketch of what it would take. |

Everything else you asked for — architecture, folder structure, business logic (expense/budget/insights calculations), frontend structure, data flow diagrams, setup, build/deploy, testing, logging, performance, design trade-offs, and a developer guide for extending the app — is covered in full below, against what's actually implemented.

## Document index

1. [Project Overview](01-project-overview.md) — what the app does, who it's for, goals and non-goals
2. [Technology Stack](02-tech-stack.md) — every dependency and why it was chosen
3. [System Architecture](03-architecture.md) — high-level and detailed architecture, layering
4. [Folder Structure](04-folder-structure.md) — every directory and file, explained
5. [Data Model](05-data-model.md) — the `Transaction` shape, categories/budgets config, storage format
6. [State Management & Internal API](06-state-management-and-internal-api.md) — `TransactionsContext`, `ThemeContext`, and the `analytics.js` function reference (signatures, params, returns, business rules)
7. [Frontend Architecture](07-frontend-architecture.md) — screens, components, navigation/routing, state flow
8. [Business Logic & Analytics](08-business-logic-and-analytics.md) — expense totals, budget pacing, insight rules, trend/merchant breakdowns, in full detail with worked examples
9. [Data Flow & Diagrams](09-data-flow-and-diagrams.md) — Mermaid sequence/flow diagrams for the major user journeys
10. [Setup & Installation](10-setup-and-installation.md) — prerequisites, install steps, running locally, environment notes (including the Node/Expo Go SDK version pitfalls we hit)
11. [Build & Deployment](11-build-and-deployment.md) — EAS build, generating an APK, publishing considerations
12. [Testing Strategy](12-testing-strategy.md) — current state (no test suite yet) plus a concrete recommended approach and sample test cases
13. [Logging & Error Handling](13-logging-and-error-handling.md) — what exists today and how to extend it
14. [Security Considerations](14-security.md) — local storage, no-auth rationale, data sensitivity
15. [Performance Optimizations](15-performance.md) — memoization, list rendering, re-render avoidance
16. [Design Decisions & Trade-offs](16-design-decisions-and-tradeoffs.md) — why local-only, why Context over Redux, why no chart library, etc.
17. [Future Improvements](17-future-improvements.md) — CSV/SMS import, real backend, household sharing, notifications
18. [Developer Guide](18-developer-guide.md) — step-by-step recipes for adding a screen, an analytics function, a category, a theme color, etc.

## Quick facts

| | |
|---|---|
| **Platform** | React Native via Expo (SDK 54, managed workflow) |
| **Target OS** | Android (primary), iOS/web technically supported by Expo but untested |
| **Backend** | None — fully local, offline-first |
| **Storage** | `@react-native-async-storage/async-storage` (on-device key-value store) |
| **State management** | React Context (`TransactionsContext`, `ThemeContext`) — no Redux/MobX/Zustand |
| **Navigation** | `@react-navigation` (native-stack + bottom-tabs) |
| **Design system** | Custom "Ledger" theme — dark and light palettes, monospace amounts, serif headers |
| **Single user** | Yes — no accounts, no login, no multi-device sync |
