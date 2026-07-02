# 12. Testing Strategy

## 12.1 Current state — be honest about this

**There is no automated test suite in this project today.** No Jest config, no test files, no CI check. The only verification method used during development has been:
1. Manual exploration through Expo Go
2. `npx expo export --platform android` as a bundling smoke test (catches syntax/import/config errors — see [10-setup-and-installation.md](10-setup-and-installation.md#105-verifying-the-app-without-a-phoneemulator))
3. Ad hoc one-off Node scripts run against `analytics.js` + `seedData.js` during development to sanity-check the insight rules' output against hand-calculated expected values (this is exactly how the numbers in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md) were verified before shipping)

This section describes the recommended approach to formalize that into a real, repeatable test suite, in priority order.

## 12.2 Why `analytics.js` should be tested first (highest ROI)

Per [03-architecture.md](03-architecture.md#32-layered-architecture-the-apps-internal-structure), `src/utils/analytics.js` is pure — no React, no AsyncStorage, no timers (except the injectable `referenceDate` parameter in `getUpcomingRenewals`, added specifically to make it testable — see [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md#86-upcoming-renewals-logic)). This means every function can be unit tested with **zero mocking**: construct a plain array of transaction objects, call the function, assert on the plain object it returns. This is the single highest-value place to add tests, because it's where all the actual business rules live (budget math, insight thresholds, trend calculations) — a regression here silently changes what the app tells the user about their money.

## 12.3 Recommended stack

| Layer | Tool | Why |
|---|---|---|
| Unit tests (`analytics.js`, `format.js`) | **Jest** | The standard JS test runner; `jest-expo` preset handles the React Native/Expo-specific transform config out of the box. |
| Component tests (screens/components) | **`@testing-library/react-native`** on top of Jest | Renders components in a lightweight test environment and lets you query/interact the way a user would (`getByText`, `fireEvent.press`), without a real device/emulator. |
| End-to-end tests (full app, real device/emulator) | **Detox** or **Maestro** | Drives the actual compiled app through real user flows (tap FAB → fill form → save → assert it appears in the list). Higher setup cost; recommended only once the app has enough surface area that manual E2E checking becomes a bottleneck. |
| Manual testing | A checklist (see §12.7) | Still necessary even with full automation, especially for visual/theme regressions that are awkward to assert on programmatically. |

### Setup (not yet done — these are the commands to run when you add this)
```bash
cd expense-tracker-app
npx expo install jest-expo jest @testing-library/react-native @testing-library/jest-native react-test-renderer
```
Add to `package.json`:
```json
{
  "scripts": { "test": "jest" },
  "jest": { "preset": "jest-expo" }
}
```

## 12.4 Unit testing — sample test cases

These are concrete, ready-to-adapt test cases for `src/utils/analytics.js`, using small hand-built transaction arrays (not the full seed data, so each test is self-contained and its expected value is obvious from reading it).

```js
// src/utils/__tests__/analytics.test.js
import {
  monthKey,
  filterByMonth,
  getCategoryTotals,
  getMonthOverMonthDelta,
  generateInsights,
  getUpcomingRenewals,
} from '../analytics';

const txn = (overrides) => ({
  id: 'x', date: '2026-07-01', amount: 100, direction: 'debit',
  merchant: 'Test', category: 'Other', source: 'Manual',
  isRecurring: false, needsReview: false, ...overrides,
});

describe('monthKey', () => {
  it('extracts YYYY-MM from an ISO date', () => {
    expect(monthKey('2026-07-03')).toBe('2026-07');
  });
});

describe('filterByMonth', () => {
  it('returns only transactions in the given month', () => {
    const txns = [txn({ date: '2026-07-01' }), txn({ date: '2026-06-15' })];
    expect(filterByMonth(txns, '2026-07')).toHaveLength(1);
  });
});

describe('getCategoryTotals', () => {
  it('sums debit amounts per category, sorted descending', () => {
    const txns = [
      txn({ category: 'Food & Dining', amount: 100 }),
      txn({ category: 'Food & Dining', amount: 50 }),
      txn({ category: 'Shopping', amount: 200 }),
      txn({ category: 'Shopping', amount: 0, direction: 'credit' }), // excluded
    ];
    expect(getCategoryTotals(txns)).toEqual([
      { category: 'Shopping', total: 200 },
      { category: 'Food & Dining', total: 150 },
    ]);
  });

  it('returns an empty array for no transactions', () => {
    expect(getCategoryTotals([])).toEqual([]);
  });
});

describe('getMonthOverMonthDelta', () => {
  it('computes percent increase correctly', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 1000 }),
      txn({ date: '2026-07-01', amount: 1200 }),
    ];
    const delta = getMonthOverMonthDelta(txns, '2026-07');
    expect(delta).toEqual({ percent: 20, direction: 'up' });
  });

  it('does not throw / divide-by-zero when the previous month has no data', () => {
    const txns = [txn({ date: '2026-07-01', amount: 500 })];
    const delta = getMonthOverMonthDelta(txns, '2026-07');
    expect(delta.percent).toBe(100);
    expect(delta.direction).toBe('up');
    expect(Number.isFinite(delta.percent)).toBe(true); // guards against the NaN/Infinity edge case
  });
});

describe('generateInsights — category share rule', () => {
  it('flags a category over 25% of monthly spend', () => {
    const txns = [
      txn({ category: 'Food & Dining', amount: 300 }),
      txn({ category: 'Shopping', amount: 700 }),
    ];
    const insights = generateInsights(txns, '2026-07');
    expect(insights).toContainEqual(
      expect.objectContaining({ type: 'category_share', category: 'Food & Dining' })
    );
  });

  it('does not flag a category at exactly 25%', () => {
    const txns = [
      txn({ category: 'Food & Dining', amount: 250 }),
      txn({ category: 'Shopping', amount: 750 }),
    ];
    const insights = generateInsights(txns, '2026-07');
    expect(insights.find((i) => i.type === 'category_share')).toBeUndefined();
  });
});

describe('getUpcomingRenewals', () => {
  it('computes days-until-renewal relative to an injected reference date', () => {
    const txns = [txn({ merchant: 'Netflix', date: '2026-07-01', isRecurring: true })];
    const renewals = getUpcomingRenewals(txns, new Date('2026-07-10'));
    // renewalDate = 2026-07-01 + 30 days = 2026-07-31; daysUntil = 21
    expect(renewals[0].daysUntil).toBe(21);
  });

  it('only keeps the most recent transaction per recurring merchant', () => {
    const txns = [
      txn({ merchant: 'Netflix', date: '2026-05-01', isRecurring: true }),
      txn({ merchant: 'Netflix', date: '2026-06-01', isRecurring: true }),
    ];
    const renewals = getUpcomingRenewals(txns, new Date('2026-07-01'));
    expect(renewals).toHaveLength(1);
    expect(renewals[0].renewalDate).toBe('2026-07-01'); // from the June txn, not May
  });
});
```

Run with `npx jest`. These are illustrative starting points, not an exhaustive suite — extend coverage to `getCategoryTrend`, `getMerchantBreakdown`, the trend-spike and subscription-growth insight rules, and `format.js`'s currency grouping (Indian lakh/crore formatting is easy to get subtly wrong and deserves its own dedicated test).

## 12.5 Integration testing — sample test cases

These test a Context + a consuming behavior together, still without a real device.

```js
// src/context/__tests__/TransactionsContext.test.js
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionsProvider, useTransactions } from '../TransactionsContext';

function Probe({ onReady }) {
  const ctx = useTransactions();
  React.useEffect(() => { if (!ctx.loading) onReady(ctx); }, [ctx.loading]);
  return null;
}

beforeEach(() => AsyncStorage.clear());

it('seeds data on first run and persists it', async () => {
  let ctx;
  render(<TransactionsProvider><Probe onReady={(c) => (ctx = c)} /></TransactionsProvider>);
  await waitFor(() => expect(ctx).toBeDefined());
  expect(ctx.transactions.length).toBeGreaterThan(0); // SEED_DATA was loaded
  const stored = await AsyncStorage.getItem('@hisabkitab/transactions');
  expect(JSON.parse(stored)).toEqual(ctx.transactions);
});

it('addTransaction prepends the new transaction and persists it', async () => {
  let ctx;
  render(<TransactionsProvider><Probe onReady={(c) => (ctx = c)} /></TransactionsProvider>);
  await waitFor(() => expect(ctx).toBeDefined());
  const before = ctx.transactions.length;

  await act(async () => {
    ctx.addTransaction({ amount: 500, merchant: 'Test Cafe', category: 'Food & Dining', date: '2026-08-01', source: 'Manual' });
  });

  await waitFor(async () => {
    const stored = JSON.parse(await AsyncStorage.getItem('@hisabkitab/transactions'));
    expect(stored).toHaveLength(before + 1);
    expect(stored[0].merchant).toBe('Test Cafe'); // prepended, not appended
  });
});
```

Note this requires `@react-native-async-storage/async-storage/jest/async-storage-mock` wired up in Jest config (an in-memory fake, since real native `AsyncStorage` isn't available outside a device/emulator) — see that package's README for the one-line setup.

## 12.6 End-to-end testing

Not set up. If added, a first E2E scenario worth automating (via Detox or Maestro) is the **add-expense happy path**, since it's the app's single most important user action:
1. Launch app
2. Tap FAB
3. Enter amount `250`, merchant `Test Merchant`
4. Select category `Groceries`
5. Tap "Save expense"
6. Assert the modal closes and "Test Merchant" appears in the Home screen's recent activity

A second worth having early: the **theme toggle round-trip** (toggle to light, force-quit and relaunch the app, assert it opens in light mode) — this is the one feature whose correctness depends on `AsyncStorage` persistence surviving a real app restart, which unit/integration tests (in-memory mocks) can't verify.

## 12.7 Manual testing checklist

Until automated coverage exists, use this checklist before considering any change "done" (see the root `CLAUDE.md`/session guidance: "start the dev server and use the feature in a browser/device before reporting complete" applies here):

- [ ] Fresh install (cleared storage) shows seeded data, not an empty/broken state
- [ ] Home: month dropdown lists all months with data, switching months updates every card
- [ ] Home: total, delta arrow, and budget bar color (amber vs. coral) match manual calculation
- [ ] Home: tapping a category row navigates to `CategoryDetailScreen` with correct data
- [ ] Home: FAB and each quick-add chip open `AddExpenseScreen` (chip pre-selects its category)
- [ ] Home: "History →" switches to the Activity tab
- [ ] Add Expense: submit is disabled until amount + merchant are valid; invalid submit shows the inline error; valid submit closes the modal and the new transaction appears immediately on Home/Activity
- [ ] Category Detail: 6-month bar chart renders proportionally; back button returns to Home
- [ ] Activity: full list, most recent first, scrolls smoothly with a large dataset
- [ ] Insights: matches the rules in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md); empty state shows correctly for a month with no fired insights
- [ ] Budgets: over-budget categories render coral; connected-sources list shows only "Manual" as Active
- [ ] Theme toggle: flips instantly across every screen; persists after force-quit and relaunch
- [ ] Status bar/top notification bar area blends with the app background (edge-to-edge) in both themes
- [ ] No console warnings/errors in the Metro/Expo dev server output during normal use

## 12.8 What "done" should mean going forward

As this project adds a real test suite, the bar to aim for: **every function in `analytics.js` has unit tests covering its documented business rules from [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md), including edge cases (empty input, zero-division, boundary values like exactly 25% or exactly 1.3×)** — that module is where a silent regression would be most damaging (wrong insights = the app actively misleading the user about their finances), and it's also the cheapest code in the entire app to test well.
