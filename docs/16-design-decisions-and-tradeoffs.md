# 16. Design Decisions & Trade-offs

A record of the significant "why did we do it this way, not that way" decisions, so future changes are made with full context instead of re-litigating settled trade-offs (or worse, silently reversing a deliberate decision without realizing it was deliberate).

## 16.1 Local-only, no backend (ADR-003)

**Decision:** all data lives in `AsyncStorage`; there is no server, no API, no database.

**Alternative considered:** a real backend (e.g. a small Node/Express API + Postgres) with the app as a thin client.

**Why local-only won:** this is explicitly a single-user personal project (per the ADR's context line: *"Personal project, single user"*). A backend would add: a server to host and pay for, an auth system to protect it, a database to manage/back up, and a deployment pipeline — all to serve exactly one user, from exactly one (or occasionally a couple of) device(s). None of that infrastructure buys anything a local JSON blob doesn't already provide for this use case, and it would meaningfully slow down how fast the app could be built and iterated on.

**Trade-off accepted:** no multi-device sync (if you use the app on two phones, they have two independent, non-syncing datasets), no server-side backup (if the phone is lost/wiped without a backup, the data is gone), and no path to a multi-user feature (household sharing, see [17-future-improvements.md](17-future-improvements.md)) without a larger architectural change later.

**When to revisit:** if multi-device use or data durability beyond "this one phone" becomes a real requirement, not before.

## 16.2 React Context over Redux/Zustand/MobX

**Decision:** two `React.createContext` + `useState` providers (`TransactionsContext`, `ThemeContext`), no external state management library.

**Why:** the app has exactly two pieces of state that need to be global (shared across unrelated components): the transaction list and the theme mode. Redux-family libraries solve problems this app doesn't have — large numbers of independent state slices, complex async middleware chains, time-travel debugging needs, or deeply nested update logic. Introducing one would mean writing boilerplate (actions, reducers, selectors) to manage what is, today, two `useState` calls.

**Trade-off accepted:** if the app's global state surface grows substantially (many more cross-cutting concerns), Context re-renders become harder to optimize than a selector-based store (Context has no built-in way to subscribe to only part of a value the way Redux selectors or Zustand's slicing can) — see [15-performance.md](15-performance.md#154-context-value-memoization). At two contexts, this cost is negligible.

**When to revisit:** if a third or fourth genuinely global context is added and screens start needing very granular subscriptions to avoid unnecessary re-renders, consider Zustand (lighter-weight than Redux, closer to this project's existing simplicity) before reaching for Redux.

## 16.3 Plain JavaScript, not TypeScript

**Decision:** the codebase is `.js`/JSX throughout, with JSDoc-style comments for type documentation (see [05-data-model.md](05-data-model.md#52-the-transaction-entity)) rather than compiler-enforced types.

**Why:** inherited from the `create-expo-app` blank JavaScript template used to scaffold the project, and never changed since. For a single small codebase maintained (so far) by one person iterating quickly, the type-safety benefit of TypeScript is real but not yet decisive — most of the "shape" bugs TypeScript would catch (wrong field name on a `Transaction`, wrong function signature) are also caught immediately by Metro's bundler/runtime errors during the manual testing that already happens on every change (see [12-testing-strategy.md](12-testing-strategy.md)).

**Trade-off accepted:** no compile-time checking that a `Transaction` object passed around actually has the right shape; no autocomplete-driven documentation of function signatures in editors that don't infer JS well; a future refactor (e.g. adding a field, per [18-developer-guide.md](18-developer-guide.md#adding-a-field-to-the-transaction-shape)) requires manually finding every place that needs updating rather than letting the compiler point them out.

**When to revisit:** migrating an Expo/RN project to TypeScript incrementally (renaming files `.js` → `.ts`/`.tsx` one at a time) is well-supported and low-risk — worth doing once the codebase is large enough that "did I update every place that touches `Transaction`?" becomes a real source of bugs, which it isn't yet at 21 source files.

## 16.4 A single flat `Transaction[]` array, not normalized/indexed storage

**Decision:** one AsyncStorage key holding one JSON array; every read/aggregation does a full in-memory scan (see [05-data-model.md](05-data-model.md), [15-performance.md](15-performance.md)).

**Alternative considered:** `expo-sqlite` (a real embedded SQL database) or a normalized structure (e.g. transactions indexed by month key from the start).

**Why the flat array won:** at the expected data scale (one person, realistically low thousands of transactions over years), a full array scan is imperceptibly fast, and the code to do it (`Array.filter`/`.reduce`) is dramatically simpler to write, read, and test than SQL queries or manual indexing. `analytics.js`'s entire design (pure functions over a plain array) depends on this simplicity.

**Trade-off accepted:** every `analytics.js` call is `O(n)` in the total transaction count, some (like `getCategoryTrend`) are effectively `O(n × months)`. See [15-performance.md](15-performance.md#158-if-this-apps-data-volume-grows-significantly) for the concrete migration path (pre-indexing by month in `TransactionsContext`) if this ever becomes measurable.

## 16.5 No charting library

**Decision:** the one chart in the app (6-month trend bars on `CategoryDetailScreen`) is hand-rolled with `View`s sized by percentage height.

**Why:** a full charting library (Victory Native, `react-native-svg-charts`, etc.) is justified when an app needs several different chart types, interactive tooltips, animations, or axis/legend systems. This app needs exactly one simple bar chart with 6 data points. The hand-rolled version is fewer total lines of code than the *setup and configuration* of a charting library would be, has zero extra dependencies, and is trivially themeable (it just uses the current `colors` object like everything else) rather than needing a separate theming API for the chart library.

**Trade-off accepted:** if the app later needs more sophisticated visualizations (e.g. a pie chart of category share, an animated line chart), a real library becomes worth its weight — don't extend the hand-rolled bar-chart approach indefinitely.

## 16.6 Emoji icons, not an icon font/SVG library

**Decision:** all icons (category icons, tab bar icons, theme toggle) are emoji characters rendered as `Text`, not `@expo/vector-icons` or custom SVGs.

**Why:** the ADR's own design spec chose emoji for category icons (🍔🛍️💡🚗🎬🛒✈️❓) — this was extended consistently to tab icons and the theme toggle for visual consistency. Emoji render natively on both platforms with zero extra dependencies or asset files, and (a secondary but real benefit for a small personal project) they need no design/export step to add a new one — just type it.

**Trade-off accepted:** less control over icon styling (stroke width, fill, consistent visual weight) than a proper icon font/SVG set provides, and emoji rendering has minor visual differences across Android OS versions/manufacturers (Samsung, Google, etc. render emoji slightly differently) — acceptable for a personal app, would be worth reconsidering for a polished public release.

## 16.7 Text-input date field, not a native date picker

**Decision:** `AddExpenseScreen`'s date field is a plain `TextInput` pre-filled with today's date (`YYYY-MM-DD`), user-editable as text.

**Why:** a proper native date picker (`@react-native-community/datetimepicker` or similar) is a real dependency with platform-specific UI quirks to handle (Android's picker looks and behaves differently from iOS's). For v1, with a single user who mostly logs expenses on the day they happen (so the pre-filled default is usually correct as-is), this wasn't worth the dependency yet.

**Trade-off accepted:** no format validation on the date field at all — a user could type "tomorrow" or "12/25/2026" and it would be silently accepted and stored as an invalid, non-ISO string, which would then break every `monthKey()`/date-comparison function downstream (see [05-data-model.md](05-data-model.md#52-the-transaction-entity)). This is a real, currently-unmitigated rough edge — see [18-developer-guide.md](18-developer-guide.md) and [17-future-improvements.md](17-future-improvements.md) for the recommended fix (add a native date picker, or at minimum a regex validation on submit).

## 16.8 Dark/light theme via a custom Context, not React Navigation's/OS's built-in dark mode alone

**Decision:** a bespoke `ThemeContext` with a manual toggle, persisted independently of the OS appearance setting (`app.json`'s `userInterfaceStyle: "automatic"` only affects native chrome defaults, not this in-app toggle).

**Why:** the original ADR (ADR-005) specified a single, deliberately-designed dark "Ledger" theme with no light mode at all. The light/dark toggle was added later as an explicit feature request, at which point building a real theme system (two palettes + a Context, see [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md#62-themecontext-srccontextthemecontextjs)) was necessary — simply following the OS's system-wide dark mode setting wouldn't satisfy "a toggle the user controls," since some users want the app in a different mode than their OS default.

**Trade-off accepted:** every component/screen needed a mechanical refactor from a static `import colors from '../theme/colors'` to `useTheme()` + `makeStyles(colors)` (see [07-frontend-architecture.md](07-frontend-architecture.md#75-styling-architecture)) — a larger one-time cost than if theming had been designed in from the start, but a normal and expected cost of adding a feature that wasn't in the original spec.

## 16.9 Edge-to-edge / fullscreen status bar

**Decision:** `app.json`'s `android.edgeToEdgeEnabled: true`, plus a `StatusBar` style that switches with the theme (`light` icons on dark background, `dark` icons on light background).

**Why:** requested explicitly (a fullscreen feel where the app's background extends behind the system status bar, rather than showing a separate solid-colored bar). This is also increasingly an Android platform requirement, not just a stylistic choice — apps targeting recent Android API levels are moved toward edge-to-edge by Google regardless.

**Trade-off accepted:** every screen must correctly pad its content using `useSafeAreaInsets()` (`insets.top`) to avoid content rendering underneath the status bar — this is already done consistently across all screens (see [07-frontend-architecture.md](07-frontend-architecture.md)), but it's a rule every *new* screen must also follow, or its content will visually collide with the status bar/notch.

## 16.10 Category budget coverage is deliberately partial

**Decision:** only 4 of the 8 categories (`Food & Dining`, `Shopping`, `Transport`, `Subscriptions`) have a budget ceiling defined in `BUDGETS`.

**Why:** this was a direct choice in the ADR's static config (section 3) — these are presumably the categories the user cares most about actively limiting, while `Groceries`, `Bills & Utilities`, `Travel`, and `Other` are tracked for visibility but not actively budgeted (bills are largely fixed/non-discretionary, groceries and travel don't lend themselves to a flat monthly ceiling the same way). This wasn't an oversight — see [05-data-model.md](05-data-model.md#53-configuration-entities-static-not-user-editable-at-runtime).

**Trade-off accepted:** budgets are hard-coded, not user-editable through any UI — changing a budget ceiling today requires editing `src/constants/categories.js` and shipping a new build. See [17-future-improvements.md](17-future-improvements.md) for making this user-configurable.
