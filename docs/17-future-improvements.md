# 17. Future Improvements

A consolidated roadmap of everything referenced as "not yet implemented" elsewhere in these docs, organized by how the original ADR itself phases ingestion, plus gaps found while documenting the current implementation.

## 17.1 Already phased in the ADR (ADR-004, ADR-006)

### Phase 2 — Statement import (CSV, then PDF)
**What:** let the user upload a bank/UPI statement file instead of typing every transaction manually.
**Where the UI already anticipates this:** `AddExpenseScreen`'s "Statement · Coming soon" tab (see [07-frontend-architecture.md](07-frontend-architecture.md#addexpensescreenjs)) — the IA is already in place, deliberately, so adding this later doesn't require a navigation redesign.
**What it would take:** a CSV parser (e.g. `papaparse`, pure JS, works fine in RN), a merchant-string-to-category rule engine (per ADR-004: keyword matching like "SWIGGY" → `Food & Dining` > a more specific sub-type), and a review screen for transactions the rules couldn't confidently categorize (this is exactly what the existing `needsReview: true` field on `Transaction` — see [05-data-model.md](05-data-model.md#52-the-transaction-entity) — is already reserved for; it's currently only set by seed data, waiting for this feature to make it meaningful). PDF table extraction (bank statements are frequently PDF-only) is explicitly called out in the ADR as "harder" and a later step within this same phase.

### Phase 3 — SMS export ingestion
**What:** import transaction data from bank/UPI SMS notifications, via an external export step (not direct in-app SMS permission — see [14-security.md](14-security.md#146-permissions) for why).
**Where the UI already anticipates this:** the "SMS export · Coming soon" tab, same screen.
**What it would take:** documentation/tooling for the external export step (e.g. a Tasker profile, or a small companion script) producing a JSON/CSV file, then routing it through the same import pipeline built for Phase 2 above.

### Later — LLM-assisted categorization (ADR-004 v3)
**What:** for merchant strings the keyword rules can't match, fall back to an LLM constrained to the existing `CATEGORY_LIST`, with low-confidence results flagged `needsReview: true` for manual confirmation.
**Dependency:** this only makes sense once Phase 2/3 ingestion exists — there's no batch of unrecognized merchant strings to categorize yet in a manual-entry-only app.

## 17.2 Gaps identified while writing this documentation

These aren't in the original ADR but surfaced naturally while documenting the current implementation in detail — each links to the doc where it's discussed in context.

| Improvement | Why it matters | Details |
|---|---|---|
| Surface storage write failures instead of silently swallowing them | A failed `AsyncStorage.setItem` after adding a transaction currently looks successful in the UI but may not persist | [13-logging-and-error-handling.md §13.4](13-logging-and-error-handling.md#134-recommended-fix-surface-storage-write-failures) |
| Add a top-level Error Boundary | An uncaught render error currently crashes to a blank screen in production with no recovery | [13-logging-and-error-handling.md §13.5](13-logging-and-error-handling.md#135-no-error-boundary-exists) |
| Add crash reporting (`sentry-expo`) | Currently zero visibility into real-world crashes once the app leaves the developer's own device | [13-logging-and-error-handling.md §13.6](13-logging-and-error-handling.md#136-logging-strategy--recommended-not-yet-implemented) |
| Build a real automated test suite (unit → integration → E2E) | None exists today; `analytics.js`'s business rules are the highest-value target | [12-testing-strategy.md](12-testing-strategy.md) (includes ready-to-adapt sample tests) |
| Validate/constrain the date field in `AddExpenseScreen` | Free-text date input accepts non-ISO strings that would silently break every date-based analytics function | [16-design-decisions-and-tradeoffs.md §16.7](16-design-decisions-and-tradeoffs.md#167-text-input-date-field-not-a-native-date-picker) |
| Add a native date picker | Better UX than typing `YYYY-MM-DD` by hand, and closes the validation gap above at the source | Same as above |
| Make `BUDGETS`/`MONTHLY_BUDGET` user-editable | Currently hard-coded in `src/constants/categories.js`; changing a budget requires a new build | [16-design-decisions-and-tradeoffs.md §16.10](16-design-decisions-and-tradeoffs.md#1610-category-budget-coverage-is-deliberately-partial) |
| Insight priority ordering | `generateInsights` returns insights in iteration order, not severity order; `HomeScreen` shows whichever fired first, not necessarily the most important one | [08-business-logic-and-analytics.md §8.3](08-business-logic-and-analytics.md#rule-priority--display) |
| More realistic renewal-cycle logic | `getUpcomingRenewals` assumes a fixed 30-day cycle from the last transaction, which drifts from real calendar-month billing over time | [08-business-logic-and-analytics.md §8.6](08-business-logic-and-analytics.md#86-upcoming-renewals-logic) |
| Index transactions by month for O(1) lookups | Every analytics function currently does a full-array scan; fine now, worth revisiting if data volume grows into the tens of thousands | [15-performance.md §15.8](15-performance.md#158-if-this-apps-data-volume-grows-significantly) |
| Migrate to TypeScript incrementally | No compile-time shape checking today; worth it once the codebase is large enough that manual shape-tracking becomes error-prone | [16-design-decisions-and-tradeoffs.md §16.3](16-design-decisions-and-tradeoffs.md#163-plain-javascript-not-typescript) |
| Set up EAS Build + `eas.json` | No standalone APK has been produced yet — the app has only run through Expo Go so far | [11-build-and-deployment.md](11-build-and-deployment.md) |
| Configure `expo-updates` for OTA pushes | Would let JS-only changes reach an already-installed APK instantly, without a new Play Store release | [11-build-and-deployment.md §11.7](11-build-and-deployment.md#117-over-the-air-ota-updates--not-configured-but-worth-knowing-about) |

## 17.3 Bigger, architecture-changing ideas (not close-term)

### Household expense management / multi-user sharing
Explicitly out of scope today (see the mapping table in [README.md](README.md)) — there is no concept of "who paid" or "split between" anywhere in the schema. A real sketch of what this would require:
- A `Household` concept and a `members: string[]` (or similar) field
- Extending `Transaction` with `paidBy` and optionally `splitWith: [{ member, share }]`
- New aggregate functions (e.g. "what does each person owe/are owed") — a genuinely new category of business logic, not an extension of the existing per-category analytics
- **This is also the point at which "no backend" (§16.1) would need to be revisited** — sharing data between multiple people's devices requires a sync mechanism, which requires a server (or a peer-to-sync approach like CRDTs, which is a much larger undertaking). This is the single biggest reason household sharing is listed as a long-term idea, not a near-term one: it invalidates the project's most foundational architecture decision.

### Real bank/UPI API integration
Per ADR-006, no official personal-use API exists for GPay/PhonePe/Paytm/PayZapp today. If that changes (e.g. India's Account Aggregator framework becomes practically accessible to individual developers), this would replace/supplement the CSV/SMS ingestion phases above with direct, real-time transaction sync — but is outside this project's control and not something to design speculatively against today.

### Push notifications for renewals/budget alerts
Currently in-app only (explicitly out of scope per the ADR). Would use `expo-notifications`; the underlying data (`getUpcomingRenewals`, the budget-pace calculation in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md)) already exists and would just need a scheduling layer on top.

### Encryption at rest
See [14-security.md §14.2](14-security.md#142-data-at-rest) for the current gap and a sketch of the approach (encrypt the JSON blob with a device-derived key before writing to `AsyncStorage`).

### Multi-device sync without a full backend
A middle ground between "fully local" and "full backend + accounts": something like a user-provided cloud storage sync (e.g. exporting/importing the transaction JSON via the device's own iCloud/Google Drive backup, or a simple file-based sync). Worth considering before committing to a full backend, if the only need is "I use this on two of my own devices," rather than genuine multi-user sharing.

## 17.4 How to prioritize from here

If picking up this project fresh, the order of leverage is roughly: (1) the logging/error-handling gaps in §17.2 — cheap, high-value, no design decisions required; (2) a first real test suite around `analytics.js` — cheap, protects the app's core value proposition (correct insights) from regressions; (3) an EAS build, so the app is actually installed permanently rather than dependent on a dev server; (4) Phase 2 statement import, the single feature most likely to meaningfully increase how much real data ends up in the app (manual entry has a natural ceiling on how much a user will bother logging by hand).
