# ADR: Personal Finance Tracker — React Native App

**Status:** Accepted
**Context owner:** Personal project, single user, India (multiple UPI apps)

Drop this file in the project root (e.g. `ADR.md` or `CLAUDE.md`) so Claude Code has full context without re-deriving decisions already made.

---

## 1. Problem being solved

User has expenses scattered across GPay, PhonePe, Paytm, PayZapp, and bank transactions with no consolidated view. Needs more than a ledger — a tool that categorizes spending, shows where money goes, and proactively flags overspending/trends (e.g. "food delivery is 28% of spend, up from 15%").

---

## 2. Decisions

### ADR-001: Platform & framework
**Decision:** React Native via **Expo** (managed workflow).
**Why:** Fastest path to a real installable app without native build tooling; one codebase; easy to later eject if native modules are needed (e.g. SMS reading for Phase 3).

### ADR-002: Navigation
**Decision:** `@react-navigation/native` with:
- A root **native stack** containing `Tabs` and a modal screen `AddExpense`.
- A **bottom tab navigator** with 4 tabs: Home, Activity, Insights, Budgets.
- Home tab contains its own nested stack: `HomeMain` → `CategoryDetail` (drill-down when a category is tapped).

**Why:** Matches the mobile mockup's navigation pattern (bottom nav + FAB + drill-down + modal add-flow) with minimal custom nav code.

### ADR-003: Local data layer (no backend yet)
**Decision:** Transactions persisted locally via `@react-native-async-storage/async-storage` as a JSON array. No server/API in v1.
- A `TransactionsContext` (React Context + `useState`) owns the raw transaction array, loading state, and `addTransaction()`.
- All aggregation/insight logic lives in **pure functions** (`src/utils/analytics.js`) that take the raw array + a month key and return derived data. Screens call these directly — the context does NOT precompute derived state, to keep it a thin data layer.
- Seed data ships in `src/data/seedData.js` and loads on first run if storage is empty.

**Why:** Keeps the data layer swappable later (SQLite, or a real backend) without touching analytics logic or screens — only the persistence implementation changes.

### ADR-004: Categorization approach
**Decision (phased):**
- **v1:** Every transaction is categorized manually at entry time (user picks from a fixed category list).
- **v2:** Add keyword/merchant rule matching for CSV/statement imports (e.g. "SWIGGY" → Food & Dining > Food Delivery).
- **v3:** LLM fallback for unmatched merchant strings, constrained to the existing category list; low-confidence matches go to a review queue (`needsReview: true` flag already in the schema).

### ADR-005: Design system — "Ledger" theme
Dark, precise, ledger-like. Numbers use a monospace-style font for alignment; headers use a serif display face for warmth against the data-heavy UI.

```js
// src/theme/colors.js
export default {
  void:     '#0E1424', // app background
  panel:    '#161E33', // card surface
  panelAlt: '#1D2740', // secondary surface / track backgrounds
  hairline: '#2A3552', // borders/dividers
  bone:     '#EDEAE0', // primary text
  boneDim:  '#9AA3BD', // secondary text
  amber:    '#E8A33D', // primary accent / warnings / FAB
  teal:     '#3FA796', // positive / on-track
  coral:    '#D66853', // overspend / high alert
  violet:   '#8B7FD1', // secondary accent (bills, subscriptions)
};
```

- Display font: a serif with personality (mockups used **Fraunces**) — optional via `expo-font`; system serif is an acceptable fallback for the skeleton.
- Body font: system default (Inter-like) is fine.
- Amounts: monospace (`Platform.OS === 'ios' ? 'Courier' : 'monospace'`) for tabular alignment — this is a deliberate signature choice, keep it everywhere money is displayed.

### ADR-006: Data ingestion phases
No official personal APIs exist for GPay/PhonePe/Paytm/PayZapp. Ingestion ships in phases:
1. **Manual entry** (v1) — form in `AddExpenseScreen`.
2. **Statement upload** (v2) — CSV parsing first (easy), PDF table extraction second (harder).
3. **SMS export** (v3) — Android-only; needs a companion export step (e.g. Tasker or a small script) since a general RN app can't silently read SMS without explicit, user-granted permission and platform restrictions. Import the resulting JSON/CSV through the same pipeline as statement upload.

The `AddExpenseScreen` should present all three as options now (statement/SMS can be disabled "Coming soon" placeholders) so the IA doesn't need to change later.

---

## 3. Data model

```ts
type Transaction = {
  id: string;
  date: string;          // ISO 8601
  amount: number;
  direction: 'debit' | 'credit';
  merchant: string;
  category: string;       // one of CATEGORY_LIST
  source: 'GPay' | 'PhonePe' | 'Paytm' | 'PayZapp' | 'Bank' | 'Manual';
  isRecurring: boolean;
  needsReview: boolean;   // low-confidence categorization flag
  notes?: string;
};
```

Category + budget config (already decided, static for v1):

```js
// src/constants/categories.js
export const CATEGORIES = {
  'Food & Dining':      { color: colors.coral,   icon: '🍔' },
  Shopping:             { color: colors.amber,    icon: '🛍️' },
  'Bills & Utilities':  { color: colors.violet,   icon: '💡' },
  Transport:            { color: colors.teal,     icon: '🚗' },
  Subscriptions:        { color: colors.boneDim,  icon: '🎬' },
  Groceries:            { color: colors.teal,     icon: '🛒' },
  Travel:               { color: colors.amber,    icon: '✈️' },
  Other:                { color: colors.boneDim,  icon: '❓' },
};

export const BUDGETS = {
  'Food & Dining': 10000,
  Shopping: 15000,
  Transport: 6000,
  Subscriptions: 5000,
};

export const MONTHLY_BUDGET = 60000;
```

---

## 4. Analytics functions needed (`src/utils/analytics.js`)

Pure functions, all take the full transaction array (plus params) and return derived data — no side effects, no storage access:

| Function | Purpose |
|---|---|
| `monthKey(dateStr)` | `'2026-07'` from an ISO date |
| `getMonthsList(transactions)` | distinct month keys, descending, with totals — powers the month dropdown |
| `filterByMonth(transactions, monthKey)` | transactions in a given month |
| `getCategoryTotals(transactions)` | `[{ category, total }]` sorted desc |
| `getTopTransactions(transactions, n=5)` | biggest individual expenses |
| `getRecentTransactions(transactions, n=2)` | most recent by date |
| `getMonthOverMonthDelta(transactions, monthKey)` | `{ percent, direction }` vs. previous month |
| `getCategoryTrend(transactions, category, monthsBack=6)` | `[{ month, total }]` ascending, for the category deep-dive chart |
| `getMerchantBreakdown(transactions, category)` | `[{ merchant, total }]` sorted desc, within a category |
| `generateInsights(transactions, monthKey)` | rule-based insight objects — see below |
| `getUpcomingRenewals(transactions)` | recurring transactions, for the "renews in N days" card |

**Insight rules (`generateInsights`):**
- Category share alert: if a category's share of total monthly spend > 25%, flag it.
- Trend alert: if current month's category total > 1.3× the trailing 3-month average (excluding current), flag "up X% vs your average."
- Subscription growth: if count of `isRecurring` transactions this month > last month, flag it.
- Stability note: if a category is within ±5% of its 6-month average, it can surface as a reassuring "on track" insight (not just warnings).

---

## 5. Screens

| Screen | Nav location | Responsibility |
|---|---|---|
| `HomeScreen` | Home tab (root) | Month dropdown, total + budget pace bar, top insight banner, quick-add chips, top transactions, recent activity (+ History link), upcoming renewals, category breakdown (tap → CategoryDetail) |
| `CategoryDetailScreen` | Home tab (pushed) | 6-month trend for one category, merchant breakdown within it |
| `TransactionsScreen` | Activity tab | Full transaction list, most recent first |
| `InsightsScreen` | Insights tab | Full list of `generateInsights()` output |
| `BudgetsScreen` | Budgets tab | Budget vs. actual per category, connected-sources status list |
| `AddExpenseScreen` | Modal (from FAB or quick-add chip) | Manual entry form (amount, merchant, category picker, date); statement upload and SMS export shown as options, disabled/"coming soon" until Phase 2/3 |

---

## 6. Folder structure

```
expense-tracker-app/
  App.js
  src/
    theme/colors.js
    constants/categories.js
    data/seedData.js
    context/TransactionsContext.js
    utils/analytics.js
    navigation/RootNavigator.js
    navigation/TabNavigator.js
    components/
      Card.js
      MonthDropdown.js
      TotalCard.js
      InsightBanner.js
      QuickAddChips.js
      CategoryBar.js
      TransactionRow.js
    screens/
      HomeScreen.js
      TransactionsScreen.js
      CategoryDetailScreen.js
      InsightsScreen.js
      BudgetsScreen.js
      AddExpenseScreen.js
```

---

## 7. Setup commands

```bash
npx create-expo-app expense-tracker-app
cd expense-tracker-app
npx expo install react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack @react-native-async-storage/async-storage
```
Then add the `src/` folder per the structure above and wire `App.js` to wrap `TransactionsProvider` → `NavigationContainer` → `RootNavigator`.

---

## 8. Explicitly out of scope for this pass

- No backend/API — everything is local (ADR-003).
- No real bank/UPI API integration — doesn't exist for individuals (see ADR-006).
- No LLM categorization yet — that's Phase 3 (ADR-004).
- No push notifications for renewals/budget alerts yet — in-app only for now.

## 9. Already-built reference assets

Two files from this exact spec already exist and can be copied in as-is (content matches sections 3–4 above): `src/theme/colors.js` and `src/constants/categories.js`. Everything else can be generated fresh from this document.
