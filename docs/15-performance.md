# 15. Performance Optimizations

## 15.1 The actual performance profile of this app

Worth stating up front: at the data volumes this app is designed for (one person's personal expenses — realistically low hundreds to low thousands of transactions even after years of use, see [05-data-model.md](05-data-model.md#56-data-volume-and-scaling-assumptions)), almost nothing here is performance-critical. The optimizations below are either "essentially free, so do them anyway" or "cheap insurance against the app degrading if usage grows." None of this required profiling to justify — it's standard React/React Native practice applied where it costs nothing to apply.

## 15.2 Memoization of derived data (`useMemo`)

Every screen that calls into `analytics.js` wraps each call in `useMemo`, keyed on the inputs that actually affect the result — see `HomeScreen.js` for the fullest example:
```js
const monthTxns = useMemo(
  () => (activeMonth ? filterByMonth(transactions, activeMonth) : []),
  [transactions, activeMonth]
);
const categoryTotals = useMemo(() => getCategoryTotals(monthTxns), [monthTxns]);
const insights = useMemo(
  () => (activeMonth ? generateInsights(transactions, activeMonth) : []),
  [transactions, activeMonth]
);
```
**Why this matters here specifically:** `HomeScreen` re-renders on *any* context change — including a `ThemeContext` toggle, which has nothing to do with the transaction data. Without `useMemo`, toggling dark/light mode would silently re-run every aggregation function (`getCategoryTotals`, `generateInsights`, etc.) for no reason, every time. With it, a theme toggle only re-renders with the *already-computed* values — the expensive array `.filter`/`.reduce` work only re-runs when `transactions` or `activeMonth` actually change.

## 15.3 `FlatList` instead of `ScrollView` + `.map()` for long lists

`TransactionsScreen` and `InsightsScreen` use `FlatList`:
```js
<FlatList
  data={sorted}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <TransactionRow transaction={item} />}
/>
```
rather than `<ScrollView>{sorted.map(...)}</ScrollView>`. `FlatList` only renders the rows currently visible on screen (plus a small windowed buffer) — a `ScrollView` mounts every single row's component tree immediately, regardless of whether it's visible. `TransactionsScreen` shows the app's *entire* transaction history with no filtering, so this is the one screen where list length is genuinely unbounded over the life of the app — using `FlatList` here means the screen stays performant whether there are 20 transactions or 20,000.

Contrast with `HomeScreen`, which uses `ScrollView` + `.map()` for its various cards (top transactions, recent activity, category breakdown) — this is fine there because those lists are always short and bounded by design (`getTopTransactions(monthTxns, 5)`, `getRecentTransactions(transactions, 2)`, and category breakdown is capped at 8 — the fixed number of categories). Don't "fix" these to use `FlatList` — it would add complexity (a `FlatList` can't easily be one section among several scrolling cards without nesting VirtualizedLists, which React Native explicitly warns against) for zero benefit at a fixed length of ≤8 items.

## 15.4 `Context` value memoization

Both contexts memoize the object passed to their `Provider`'s `value` prop where it matters:
```js
// ThemeContext.js
const value = useMemo(() => ({ mode, colors, toggleTheme }), [mode, colors, toggleTheme]);
```
Without this, `AppContent`/every consumer would receive a **new object reference** on every render of `ThemeProvider` (even if `mode` didn't change), which would defeat any `React.memo` or dependency-array comparison downstream that checks `useTheme()`'s return value by reference. `TransactionsContext` doesn't currently do this for its own value object — see §15.7 for why that's a minor, currently-harmless gap.

## 15.5 Native-thread navigation and gestures

`react-native-screens` (a required peer dependency of React Navigation, see [02-tech-stack.md](02-tech-stack.md)) backs each navigator screen with a real native view container rather than keeping every screen's React tree permanently mounted in the JS thread. Combined with `react-native-gesture-handler` running gesture recognition off the JS thread, stack transitions (e.g. `HomeScreen` → `CategoryDetailScreen`) stay smooth even if the JS thread is momentarily busy (e.g. running `generateInsights` on a large dataset) — this is "free" performance that comes from simply using React Navigation's standard setup correctly, not from anything custom in this app.

## 15.6 No charting library overhead

The 6-month trend "chart" on `CategoryDetailScreen` is plain `View`s with percentage-based heights (see [02-tech-stack.md](02-tech-stack.md) and [07-frontend-architecture.md](07-frontend-architecture.md#categorydetailscreenjs)), not a charting library. For 6 data points, this is both simpler code and strictly faster to render than pulling in an SVG-based charting library's rendering pipeline — a rare case where "the simple hand-rolled version" wins on both code size and performance, not just one.

## 15.7 Known non-optimizations (deliberate, and why they're fine)

- **`makeStyles(colors)` is called fresh on every render**, not memoized with `useMemo` (see [07-frontend-architecture.md](07-frontend-architecture.md#75-styling-architecture)). `StyleSheet.create` on a small, fixed-shape object is cheap, and React Native's `StyleSheet.create` doesn't actually do expensive work at runtime in the new architecture the way it historically registered native style IDs — it's a thin wrapper. This would only be worth revisiting if profiling ever showed style object creation as a measurable cost, which is extremely unlikely at this component tree size.
- **`TransactionsContext`'s `value` object is not memoized** the way `ThemeContext`'s is. This means every `setTransactions` call (i.e. every added transaction, and the initial load) creates a new context value, which is correct and necessary anyway (the data really did change) — there's no meaningful optimization being missed here, unlike `ThemeContext` where `colors`/`toggleTheme` genuinely can stay referentially stable across unrelated re-renders.
- **No pagination, virtualization windowing tuning, or lazy-loading of transaction data.** The entire dataset loads into memory on every app start (see [05-data-model.md](05-data-model.md#56-data-volume-and-scaling-assumptions)). This is the single biggest "performance decision" in the app, and it's deliberate: at expected data volumes, loading everything up front is simpler and this is a reasonable place to have picked simplicity over premature scalability — see [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md) for the explicit trade-off and the threshold at which it should be revisited.
- **`analytics.js` functions re-scan the full array on every call**, even ones called multiple times per render with overlapping work (e.g. `getCategoryTrend` internally calls `getMonthsList` and `filterByMonth` in a loop over each month). This is `O(months × transactions)` rather than a single pre-indexed pass, which is fine at hundreds of transactions and would start to matter in the tens-of-thousands range — see [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md) for when to consider an indexed/memoized rewrite (e.g. pre-grouping transactions by month once, rather than filtering the full array per month requested).

## 15.8 If this app's data volume grows significantly

The concrete signal to revisit the above (from "load everything, filter in JS" to something more scalable) is if a single user's transaction count approaches the tens of thousands (e.g. multi-year statement imports once Phase 2 CSV/PDF ingestion ships, see [17-future-improvements.md](17-future-improvements.md)). At that point, the recommended path is not "add pagination to the UI" (a personal finance app benefits from seeing full-year trends, not paged lists) but rather: **index once, on load** — e.g. build a `Map<monthKey, Transaction[]>` in `TransactionsContext` alongside the flat array, so `analytics.js` functions that currently do `transactions.filter(t => monthKey(t.date) === key)` can do an O(1) map lookup instead of an O(n) scan. This would be a `TransactionsContext` + `analytics.js` change only — no screen or component would need to change, which is exactly the payoff of the layering described in [03-architecture.md](03-architecture.md).
