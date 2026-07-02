# 6. State Management & Internal API

*(This is the "API documentation" doc for a project with no server. There are no HTTP endpoints, so this documents the equivalent surface: the two Context APIs every screen talks to, and the pure-function library that does all the calculation. Treat each function signature below exactly as you would a REST endpoint's contract — parameters, return shape, and business rules included.)*

## 6.1 `TransactionsContext` (`src/context/TransactionsContext.js`)

### What it does
Owns the single source of truth for all transaction data: loads it from `AsyncStorage` on startup (seeding it on first run), holds it in React state, and exposes a way to add new transactions that also persists them.

### Why it exists
Every screen needs read access to the transaction list, and one screen (`AddExpenseScreen`) needs to write to it. Rather than have every screen talk to `AsyncStorage` directly (duplicated load/parse/error-handling logic, and no shared in-memory cache), this Context centralizes it. Per ADR-003, it is deliberately a **thin data layer** — it does not precompute any derived/aggregated data. That's the job of `analytics.js` (§6.3), so that swapping the storage backend later (e.g. to SQLite or a real API) never requires touching business logic.

### Public API (via `useTransactions()`)

```js
const { transactions, loading, addTransaction } = useTransactions();
```

| Member | Type | Description |
|---|---|---|
| `transactions` | `Transaction[]` | The full, current transaction array. Empty array before the initial load resolves. |
| `loading` | `boolean` | `true` until the initial `AsyncStorage.getItem` call resolves (whether it found existing data or had to seed). Screens use this to show a "Loading…" state instead of a flash of empty data. |
| `addTransaction(transaction)` | `(input: Partial<Transaction>) => void` | Adds a new transaction. See below for exactly what it fills in. |

### `addTransaction(transaction)` — business logic

```js
const addTransaction = useCallback(async (transaction) => {
  setTransactions((prev) => {
    const next = [
      {
        id: `txn-${prev.length + 1}-${Math.floor(Math.random() * 1e6)}`,
        isRecurring: false,
        needsReview: false,
        direction: 'debit',
        ...transaction,
      },
      ...prev,
    ];
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  });
}, []);
```

**Contract:**
- **Input:** an object that must include at minimum `amount`, `merchant`, `category`, `date`, `source` (this is exactly what `AddExpenseScreen` passes). Any of `id`, `isRecurring`, `needsReview`, `direction` may be omitted — defaults are filled in.
- **Defaults applied:** `id` is auto-generated (`txn-{currentCount}-{random 0–999999}` — not a UUID, see [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md)); `isRecurring` defaults `false`; `needsReview` defaults `false`; `direction` defaults `'debit'`.
- **No validation happens here.** If you pass an invalid `category` string or a negative `amount`, this function will happily store it. **Validation is the caller's responsibility** — see `AddExpenseScreen`'s `handleSubmit` in [07-frontend-architecture.md](07-frontend-architecture.md#addexpensescreen), which checks for a valid positive numeric amount and a non-empty merchant *before* calling `addTransaction`.
- **Ordering:** new transactions are prepended (`[newTxn, ...prev]`), so the freshest addition is always first in the raw array — though most screens re-sort by `date` anyway via `analytics.js` functions.
- **Persistence:** every call fires an `AsyncStorage.setItem` with the *entire* updated array (not just the new item — AsyncStorage has no partial-update API for JSON blobs). The `.catch(() => {})` deliberately swallows storage write failures rather than crashing the UI — see [13-logging-and-error-handling.md](13-logging-and-error-handling.md) for why this is a known gap worth revisiting.
- **Return value:** none (`void`). The caller doesn't need the new object back — the caller already has all its fields, and any screen reading `transactions` will re-render automatically because it's Context state.

### Initial load logic

```js
useEffect(() => {
  (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setTransactions(JSON.parse(raw));
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
        setTransactions(SEED_DATA);
      }
    } catch (e) {
      setTransactions(SEED_DATA);
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

- Runs exactly once, on mount (empty dependency array).
- **First run ever:** no key exists → seed data is written to storage *and* set as state.
- **Every subsequent run:** existing JSON is parsed and used as-is.
- **Error path** (e.g. corrupted JSON): falls back to in-memory seed data **without** overwriting whatever's in storage — so a corrupted-storage user sees a working app on that launch, but the underlying corrupt data is still there next launch. This is a known limitation — see [13-logging-and-error-handling.md](13-logging-and-error-handling.md).

### Storage key
`@hisabkitab/transactions` — see [05-data-model.md](05-data-model.md).

## 6.2 `ThemeContext` (`src/context/ThemeContext.js`)

### What it does
Owns the current color-scheme mode (`'dark'` or `'light'`), persists the user's choice, and exposes the resolved color palette for that mode.

### Why it exists
The app supports a manual dark/light toggle (independent of the OS setting) that must persist across app restarts and be available to every screen and component for styling. Centralizing it avoids prop-drilling a `mode`/`colors` pair through the entire component tree.

### Public API (via `useTheme()`)

```js
const { mode, colors, toggleTheme } = useTheme();
```

| Member | Type | Description |
|---|---|---|
| `mode` | `'dark' \| 'light'` | The current mode. Defaults to `'dark'` until the persisted value (if any) loads. |
| `colors` | `object` | The resolved color palette for the current mode — either `dark` or `light` from `src/theme/colors.js` (see [05-data-model.md](05-data-model.md) is not the right link here; see `src/theme/colors.js` directly, or [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md) for the palette design rationale). |
| `toggleTheme()` | `() => void` | Flips `mode` between `'dark'` and `'light'`, and persists the new value. |

### `toggleTheme()` — business logic

```js
const toggleTheme = useCallback(() => {
  setMode((prev) => {
    const next = prev === 'dark' ? 'light' : 'dark';
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    return next;
  });
}, []);
```

- Pure toggle — there's no "set to a specific mode" API exposed, because the only UI trigger is a single tap-to-flip icon button (see `HomeScreen`'s ☀️/🌙 button). If a settings screen with explicit "Dark / Light / System" radio options is added later, extend this API with a `setMode(mode)` function rather than reusing `toggleTheme` — see [18-developer-guide.md](18-developer-guide.md).
- `colors` is derived, not stored: `const colors = mode === 'dark' ? dark : light;` — always in sync with `mode`, never stale.

### Initial load logic
Same pattern as `TransactionsContext`: an effect reads `AsyncStorage.getItem('@hisabkitab/theme-mode')` once on mount; if it's `'light'` or `'dark'`, `mode` is set to it; otherwise the `'dark'` default stands (this is also what a fresh install sees before the effect resolves — there is deliberately no loading gate for theme, unlike transactions, since a one-frame flash of the default dark theme is an acceptable trade-off for not blocking the whole UI on this read).

### Storage key
`@hisabkitab/theme-mode` — see [05-data-model.md](05-data-model.md).

## 6.3 `analytics.js` function reference (`src/utils/analytics.js`)

This is the app's actual "business logic API" — a library of pure functions. **None of these read AsyncStorage, use React hooks, or have side effects.** Every function takes the full `Transaction[]` array (plus extra parameters) and returns plain derived data. This makes them trivially unit-testable (see [12-testing-strategy.md](12-testing-strategy.md)) and reusable from any screen.

> Full worked examples with real numbers (using the seed dataset) are in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md). This section is the API reference; that one is the "how the math works" explanation.

### `monthKey(dateStr)`
`(dateStr: string) => string`
Returns the `'YYYY-MM'` prefix of an ISO date string (`'2026-07-03'` → `'2026-07'`). The building block every month-based grouping function uses.

### `filterByMonth(transactions, key)`
`(transactions: Transaction[], key: string) => Transaction[]`
Returns only the transactions whose `monthKey(date) === key`. Does **not** filter by `direction` — callers filter debit/credit themselves if needed.

### `getMonthsList(transactions)`
`(transactions: Transaction[]) => { month: string, total: number }[]`
Groups all **debit** transactions by month, sums each, and returns them **descending** by month (most recent first). Powers the month-picker dropdown on `HomeScreen`. If `transactions` is empty, returns `[]`.

### `getCategoryTotals(transactions)`
`(transactions: Transaction[]) => { category: string, total: number }[]`
Sums **debit** amounts per category, sorted **descending** by total. Used for the category breakdown list and (indirectly, via `filterByMonth` first) the budgets screen.

### `getTopTransactions(transactions, n = 5)`
`(transactions: Transaction[], n?: number) => Transaction[]`
Returns the `n` largest **debit** transactions by amount, descending. Used on `HomeScreen`'s "Top transactions" card (called with a month-filtered array, so it's "top transactions this month").

### `getRecentTransactions(transactions, n = 2)`
`(transactions: Transaction[], n?: number) => Transaction[]`
Returns the `n` most recent transactions by `date`, descending — **not** filtered by direction (a credit would show up here if one existed). Used on `HomeScreen`'s "Recent activity" card, called with the *entire* transaction history (not month-filtered), so it always shows the truly latest activity regardless of which month is selected for the rest of the dashboard.

### `getMonthOverMonthDelta(transactions, key)`
`(transactions: Transaction[], key: string) => { percent: number, direction: 'up'|'down'|'flat' }`
Compares total debit spend in month `key` vs. the previous calendar month. See [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md#month-over-month-delta) for the exact formula and edge cases (e.g. previous month has zero spend).

### `getCategoryTrend(transactions, category, monthsBack = 6)`
`(transactions: Transaction[], category: string, monthsBack?: number) => { month: string, total: number }[]`
Returns up to `monthsBack` months of totals for one category, **ascending** by month (oldest first — this is the one function in the module that returns ascending order, because it directly feeds a left-to-right trend chart on `CategoryDetailScreen`). Months present in the data but with zero spend in this category still appear, with `total: 0`.

### `getMerchantBreakdown(transactions, category)`
`(transactions: Transaction[], category: string) => { merchant: string, total: number }[]`
Sums debit amounts by merchant, restricted to one category, sorted descending. Powers `CategoryDetailScreen`'s "By merchant" list.

### `generateInsights(transactions, key)`
`(transactions: Transaction[], key: string) => Insight[]`
The most complex function in the module — evaluates four rules (category share, trend spike, subscription growth, stability) for the given month and returns an array of insight objects. **Fully documented, rule by rule, with worked numbers, in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md#insight-rules-in-detail).**

Return shape per insight:
```js
{
  id: string,           // stable key, e.g. 'trend-Food & Dining' or 'subscription-growth'
  type: 'category_share' | 'trend' | 'subscription_growth' | 'stability',
  category?: string,     // absent only for 'subscription_growth'
  severity: 'alert' | 'warning' | 'positive',
  message: string,       // human-readable, ready to render as-is
  meta: object,          // the raw numbers behind the message (varies by type)
}
```

### `getUpcomingRenewals(transactions, referenceDate = new Date())`
`(transactions: Transaction[], referenceDate?: Date) => Renewal[]`
For every distinct recurring (`isRecurring: true`) merchant, finds its most recent transaction, projects a renewal 30 days later, and returns days-until-renewal relative to `referenceDate`. Sorted ascending (soonest first). See [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md#upcoming-renewals) for the full logic and its known limitation (fixed 30-day cycle assumption).

Return shape per renewal:
```js
{
  merchant: string,
  category: string,
  amount: number,
  renewalDate: string,   // 'YYYY-MM-DD'
  daysUntil: number,     // can be negative if overdue
}
```

**Note the injectable `referenceDate` parameter** — this is what makes the function testable without mocking `Date` globally (see [12-testing-strategy.md](12-testing-strategy.md) for a sample test using it).

## 6.4 `format.js` reference (`src/utils/format.js`)

Small formatting helpers, not business logic, but part of the same "internal API" surface since they're imported everywhere:

| Function | Signature | Behavior |
|---|---|---|
| `formatCurrency(amount)` | `(number) => string` | Rounds to the nearest whole rupee, formats with Indian digit grouping (lakhs/crores — `,` every 2 digits after the first 3, e.g. `₹1,23,456`), prefixes `₹`, and prefixes `-` for negative amounts. |
| `formatDate(dateStr)` | `(string) => string` | `'en-IN'` locale, e.g. `'3 Jul'`. |
| `formatMonthLabel(monthKey)` | `(string) => string` | Takes a `'YYYY-MM'` key, returns e.g. `'July 2026'`. |

## 6.5 Why this counts as "the API" for this project

If this were a full-stack app, a new screen or feature would be built by calling a REST endpoint and handling its response/error contract. Here, the equivalent unit of work is: **call a Context hook for data/mutations, and call `analytics.js` functions to derive what you need to display.** Every screen in [07-frontend-architecture.md](07-frontend-architecture.md) is built from exactly these two building blocks — there is no other data-access mechanism anywhere in the app.
