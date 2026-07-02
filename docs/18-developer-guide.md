# 18. Developer Guide — How to Extend This App

Concrete, step-by-step recipes for the most common changes. Each follows the existing patterns documented in [03-architecture.md](03-architecture.md) through [09-data-flow-and-diagrams.md](09-data-flow-and-diagrams.md) — read those first if a step here doesn't make sense in isolation.

## 18.1 Adding a new screen

Example: adding a hypothetical `SettingsScreen`.

1. **Create the file:** `src/screens/SettingsScreen.js`. Copy the shape of an existing simple screen (e.g. `BudgetsScreen.js`) as a starting template:
   ```js
   import React from 'react';
   import { View, Text, ScrollView, StyleSheet } from 'react-native';
   import { useSafeAreaInsets } from 'react-native-safe-area-context';
   import { useTheme } from '../context/ThemeContext';
   import { fonts } from '../theme/typography';

   export default function SettingsScreen() {
     const { colors } = useTheme();
     const styles = makeStyles(colors);
     const insets = useSafeAreaInsets();

     return (
       <View style={styles.container}>
         <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }}>
           <Text style={styles.title}>Settings</Text>
           {/* ... */}
         </ScrollView>
       </View>
     );
   }

   const makeStyles = (colors) => StyleSheet.create({
     container: { flex: 1, backgroundColor: colors.void },
     title: { color: colors.bone, fontFamily: fonts.display, fontSize: 22, marginBottom: 16 },
   });
   ```
   **Don't skip `useSafeAreaInsets()` + `insets.top` padding** — every screen needs it because of the edge-to-edge status bar config (see [16-design-decisions-and-tradeoffs.md §16.9](16-design-decisions-and-tradeoffs.md#169-edge-to-edge--fullscreen-status-bar)); forgetting it means your new screen's content renders underneath the status bar.

2. **Register it in a navigator.** If it's a new tab: add it to `src/navigation/TabNavigator.js`'s `<Tab.Navigator>` and to the `TAB_ICONS` map (pick an emoji, per [16-design-decisions-and-tradeoffs.md §16.6](16-design-decisions-and-tradeoffs.md#166-emoji-icons-not-an-icon-fontsvg-library)). If it's reached by navigating from another screen (not a tab itself): add it to the relevant stack navigator (`RootNavigator.js` for a modal like `AddExpense`, or `TabNavigator.js`'s `HomeStack` for a Home-tab drill-down like `CategoryDetail`) — see [07-frontend-architecture.md §7.1](07-frontend-architecture.md#71-routing--navigation) for the decision tree on which navigator a new screen belongs in.

3. **Wire up navigation to it** from wherever the user should reach it: `navigation.navigate('Settings')`.

4. **Verify:** run `npx expo export --platform android --output-dir /tmp/check` (see [10-setup-and-installation.md §10.5](10-setup-and-installation.md#105-verifying-the-app-without-a-phoneemulator)) to catch import/registration errors fast, then check it for real in Expo Go.

## 18.2 Adding a new reusable component

Example: adding a hypothetical `ProgressRing` component.

1. Create `src/components/ProgressRing.js`, following the theme-aware pattern used by every existing component (see [07-frontend-architecture.md §7.5](07-frontend-architecture.md#75-styling-architecture)):
   ```js
   import React from 'react';
   import { View, StyleSheet } from 'react-native';
   import { useTheme } from '../context/ThemeContext';

   export default function ProgressRing({ fraction }) {
     const { colors } = useTheme();
     const styles = makeStyles(colors);
     return <View style={styles.ring} />;
   }

   const makeStyles = (colors) => StyleSheet.create({ /* ... */ });
   ```
2. **Keep it presentational.** Per [07-frontend-architecture.md §7.3](07-frontend-architecture.md#73-components), a component must not call `useTransactions()`, import `analytics.js`, or navigate. It receives everything it needs as props and calls `onPress`/similar callbacks for interactions. If you find yourself wanting to fetch or compute data inside a component, that logic belongs in the screen that renders it instead.
3. Import and use it from whichever screen(s) need it.

## 18.3 Adding a new analytics function ("new API endpoint" equivalent)

Example: adding a hypothetical `getAverageDailySpend(transactions, monthKey)`.

1. Add the function to `src/utils/analytics.js`, following the module's hard rule: **no React, no `AsyncStorage`, no side effects — plain input, plain output.**
   ```js
   export function getAverageDailySpend(transactions, key) {
     const monthTxns = filterByMonth(transactions, key).filter(isSpend);
     const total = monthTxns.reduce((s, t) => s + t.amount, 0);
     const daysInMonth = new Date(...key.split('-').map(Number), 0).getDate(); // or however you compute it
     return total / daysInMonth;
   }
   ```
2. **Document it** in [06-state-management-and-internal-api.md §6.3](06-state-management-and-internal-api.md#63-analyticsjs-function-reference-srcutilsanalyticsjs) (signature, params, return shape, business rule) and, if it has a non-trivial rule, add a worked example in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md) — this is the project's substitute for API documentation, and keeping it current is how the next developer (or you, in six months) understands the function without re-reading its implementation.
3. **Add a unit test** — see [12-testing-strategy.md §12.4](12-testing-strategy.md#124-unit-testing--sample-test-cases) for the pattern (small hand-built transaction arrays, assert on exact expected output).
4. Call it from whichever screen needs it, wrapped in `useMemo` if the screen already memoizes its other derived data (see [15-performance.md §15.2](15-performance.md#152-memoization-of-derived-data-usememo)).

## 18.4 Adding a new category

1. Add an entry to `CATEGORIES` in `src/constants/categories.js`:
   ```js
   'Health & Fitness': { color: shared.teal, icon: '🏋️' },
   ```
   Pick a color from `shared` (the theme-independent accent palette in `src/theme/colors.js`) — reuse an existing accent rather than introducing a new one unless the visual design genuinely calls for a new hue (see [05-data-model.md §5.3](05-data-model.md#53-configuration-entities-static-not-user-editable-at-runtime)).
2. That's it for the category to be selectable in `AddExpenseScreen` and to render correctly everywhere `CATEGORIES[category]` is looked up (`CATEGORY_LIST` is derived automatically via `Object.keys(CATEGORIES)`).
3. **Optional:** add a budget ceiling in `BUDGETS` if this category should appear on `BudgetsScreen`'s budget-vs-actual panel (see [16-design-decisions-and-tradeoffs.md §16.10](16-design-decisions-and-tradeoffs.md#1610-category-budget-coverage-is-deliberately-partial) — not every category needs one).
4. **Optional:** add some example transactions in `src/data/seedData.js` if you want the new category to be populated for first-run demo purposes — see [05-data-model.md §5.4](05-data-model.md#54-the-seed-dataset) for the `t(...)` helper pattern used there.

## 18.5 Adding a field to the `Transaction` shape

This is the closest equivalent to "adding a database column," and per [05-data-model.md §5.7](05-data-model.md#57-schema-evolution--migrations) requires handling both new and already-stored data:

1. **Decide if it's required or optional.** Optional is almost always safer (see step 3).
2. **Update the shape documentation** in [05-data-model.md §5.2](05-data-model.md#52-the-transaction-entity) (the table and the JSDoc `@typedef`) — this is the project's schema of record, since there's no formal schema file.
3. **Handle existing stored data.** Anyone with the app already installed has `Transaction` objects in `AsyncStorage` without your new field. Either:
   - Make it optional and use `transaction.newField ?? defaultValue` everywhere you read it (simplest, no migration needed), **or**
   - Write a one-time migration in `TransactionsContext`'s load effect:
     ```js
     const raw = await AsyncStorage.getItem(STORAGE_KEY);
     if (raw) {
       const parsed = JSON.parse(raw).map((t) => ({ newField: 'someDefault', ...t }));
       setTransactions(parsed);
     }
     ```
4. **Update every place that creates a `Transaction`:** `AddExpenseScreen`'s `handleSubmit` (if the user should be able to set it), `TransactionsContext.addTransaction`'s defaults (if it needs a fallback), and `src/data/seedData.js`'s `t(...)` helper (if seed data should demonstrate it).
5. **Update `analytics.js` if the new field affects any derived calculation** — e.g. adding a field that should exclude certain transactions from totals would need every relevant function (`getCategoryTotals`, `getMonthsList`, etc.) updated consistently, similar to how `direction === 'debit'` is checked today (see [08-business-logic-and-analytics.md §8.1](08-business-logic-and-analytics.md#81-expense-calculation-logic)).
6. **Add/update tests** covering the new field's effect on any analytics function that now branches on it.

## 18.6 Adding a new insight rule

`generateInsights` in `src/utils/analytics.js` is where the four existing rules live (see [08-business-logic-and-analytics.md §8.3](08-business-logic-and-analytics.md#83-insight-rules--in-detail) for the exact pattern each follows). To add a fifth:

1. Decide if it's **per-category** (evaluated inside the existing `categories.forEach(...)` loop) or **whole-month** (evaluated once, like the subscription-growth rule, outside that loop).
2. Follow the existing shape exactly — every insight pushed must have `id`, `type`, `severity` (`'alert' | 'warning' | 'positive'`), `message` (a complete, ready-to-render string — don't make the UI layer construct the sentence), and `meta` (the raw numbers behind the message, for anyone who wants to build custom UI around it later instead of just displaying `message`).
3. Give it a stable, unique `id` (the existing convention is `` `{type}-{category}` `` for per-category rules, or a fixed string like `'subscription-growth'` for whole-month rules) — this matters if any consumer ever keys a list by `insight.id` (React Native's `FlatList`/`.map` key, or a future "dismiss this insight" feature).
4. Document the rule's exact threshold/logic in [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md), following the format of the existing four rules (logic snippet + a worked example against the real seed data, or a note that no seed data currently triggers it).
5. Add a unit test asserting both that it fires when it should and does *not* fire at the boundary (see the "does not flag a category at exactly 25%" test pattern in [12-testing-strategy.md §12.4](12-testing-strategy.md#124-unit-testing--sample-test-cases)).

## 18.7 Adding a new theme color

1. Add the key to **both** palettes in `src/theme/colors.js` — `dark` and `light` — with an appropriate value for each. If the color is meant to be identical in both themes (like an accent color), add it to `shared` instead and spread it into both (see [05-data-model.md §5.3](05-data-model.md#53-configuration-entities-static-not-user-editable-at-runtime) for the existing `shared` vs. per-theme split rationale).
2. Use it via `const { colors } = useTheme(); ...colors.yourNewKey` inside a `makeStyles(colors)` function — never hard-code a hex value directly in a component/screen's styles (see [07-frontend-architecture.md §7.5](07-frontend-architecture.md#75-styling-architecture)), or it won't respond to the dark/light toggle.
3. If it's meant to be used for icons/category accents specifically (not surfaces/text), consider whether it belongs in `shared` in `src/theme/colors.js` (theme-independent) rather than `dark`/`light` — category colors intentionally don't change between themes (see [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md)).

## 18.8 Common pitfalls checklist (read before opening a PR against yourself)

- [ ] Did you use `useTheme()` + `makeStyles(colors)` instead of a static `import colors from '../theme/colors'`? (The static default export still exists for compatibility but nothing in the app should use it — see [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md).)
- [ ] Did you pad new screen content with `useSafeAreaInsets().top`? (Edge-to-edge status bar — see §18.1.)
- [ ] Did you keep `analytics.js` functions pure (no React, no `AsyncStorage`, no `Date.now()`/`Math.random()` unless injected as a parameter like `getUpcomingRenewals`'s `referenceDate`)?
- [ ] Did you keep business logic out of `src/components/*` (presentational only) and out of the screen's JSX (derive with `analytics.js`, memoize with `useMemo`, then render)?
- [ ] Did you run `npx expo install <package>` (not plain `npm install`) for any new dependency, so it resolves to the version compatible with this project's pinned Expo SDK (see [10-setup-and-installation.md §10.4](10-setup-and-installation.md#104-a-real-incident-sdk-version-mismatches))?
- [ ] Did you update the relevant doc(s) in `/docs`? Specifically: [05-data-model.md](05-data-model.md) for shape changes, [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md) for new Context/analytics functions, [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md) for new business rules.
- [ ] Did you manually verify the change in Expo Go (or at minimum `npx expo export`) before considering it done? See [12-testing-strategy.md §12.7](12-testing-strategy.md#127-manual-testing-checklist).
