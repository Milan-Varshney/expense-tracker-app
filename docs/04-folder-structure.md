# 4. Folder Structure

```
HisabKitab/                            (repo root)
├── ADR-expense-tracker-app.md         Original architecture decision record — the spec this app was built from
├── docs/                              You are here — this documentation set
└── expense-tracker-app/               The Expo app itself
    ├── App.js                         Composition root: providers, navigation container, StatusBar
    ├── index.js                       Expo/RN entry point (registers App.js as the root component)
    ├── app.json                       Expo config: app name, icons, Android package id, edge-to-edge flag
    ├── package.json                   Dependencies and npm scripts
    ├── .nvmrc                         Pins Node version (22) for this project
    ├── assets/                        App icons, splash image, favicon (default Expo placeholders)
    └── src/
        ├── theme/
        │   ├── colors.js              Dark + light color palettes, plus theme-independent "shared" accents
        │   └── typography.js          Font family constants (display/body/mono)
        ├── constants/
        │   └── categories.js          CATEGORIES (icon+color per category), BUDGETS, MONTHLY_BUDGET, SOURCES
        ├── data/
        │   └── seedData.js            ~6 months of hand-authored demo transactions, loaded on first run
        ├── context/
        │   ├── TransactionsContext.js Owns the transaction array; AsyncStorage-backed; addTransaction()
        │   └── ThemeContext.js        Owns light/dark mode; AsyncStorage-backed; toggleTheme()
        ├── utils/
        │   ├── analytics.js           All business-logic/derived-data functions (pure, no side effects)
        │   └── format.js              formatCurrency, formatDate, formatMonthLabel
        ├── navigation/
        │   ├── RootNavigator.js       Top-level stack: Tabs + AddExpense modal
        │   └── TabNavigator.js        Bottom tabs + the nested Home stack (HomeMain → CategoryDetail)
        ├── components/                Reusable, presentational, theme-aware UI pieces
        │   ├── Card.js                Generic bordered/rounded surface container
        │   ├── MonthDropdown.js       Tap-to-open month picker (modal + list)
        │   ├── TotalCard.js           Big total-spend number + budget pace bar
        │   ├── InsightBanner.js       One insight, colored/iconed by severity
        │   ├── QuickAddChips.js       Row of one-tap category shortcuts (→ AddExpense)
        │   ├── CategoryBar.js         Icon + name + amount + proportional bar (breakdown & budgets)
        │   └── TransactionRow.js      One transaction line (icon, merchant, date/source, amount)
        └── screens/                   One file per navigable destination
            ├── HomeScreen.js          Home tab root — the main dashboard
            ├── CategoryDetailScreen.js Drill-down from a category (trend chart + merchant breakdown)
            ├── TransactionsScreen.js  Activity tab — full transaction history
            ├── InsightsScreen.js      Insights tab — full list of generated insights
            ├── BudgetsScreen.js       Budgets tab — budget vs. actual, connected-sources status
            └── AddExpenseScreen.js    Modal — manual entry form
```

## 4.1 Why this structure

The layout is a direct implementation of the "Folder structure" section in the original ADR (section 6), with two small, justified additions:

- **`theme/typography.js`** — the ADR's design system section (ADR-005) mandates a specific font treatment (serif display headers, monospace money) but didn't list a dedicated file for it. Centralizing the three font-family constants here means every screen/component references `fonts.display` / `fonts.mono` instead of repeating `Platform.select(...)` logic everywhere.
- **`utils/format.js`** — `formatCurrency`, `formatDate`, and `formatMonthLabel` are used by nearly every screen and component. Keeping them in one place avoids duplicating Indian-numbering-system currency formatting (`₹12,34,567` grouping, not `₹1,234,567`) in five different files.

Everything else maps 1:1 to the ADR.

## 4.2 Grouping philosophy: "what kind of thing is this?", not "what feature is this for?"

Note that folders are organized **by technical role** (screens, components, context, utils) rather than **by feature** (e.g. `features/budgets/`, `features/insights/`). This works well here because:

- The app is small (6 screens, 7 components, 2 contexts, 1 analytics module) — feature-folder overhead isn't justified yet.
- Screens are the natural feature boundary already (`BudgetsScreen.js` *is* the budgets feature); there's no need for an extra folder layer.
- `analytics.js` intentionally serves *every* screen — it can't cleanly belong to one feature folder.

If the app grows substantially (see [17-future-improvements.md](17-future-improvements.md)), revisit this — but don't restructure preemptively. See [18-developer-guide.md](18-developer-guide.md) for guidance on where new files should go as the app grows.

## 4.3 Import conventions

- All internal imports use relative paths (`../theme/colors`, `../../utils/analytics`) — there is no path-aliasing (`@/`) configured in `babel.config.js` or `metro.config.js`. If you add one, update this doc.
- Screens import from `components/`, `context/`, `utils/`, `constants/`, and `theme/` — never the reverse (a component must never import a screen).
- `utils/analytics.js` imports nothing from `context/`, `components/`, or `screens/` — see [03-architecture.md](03-architecture.md#32-layered-architecture-the-apps-internal-structure) for why this boundary is load-bearing.

## 4.4 Files intentionally absent

New developers coming from a full-stack background often look for these and won't find them — that's expected, not a gap:

- No `src/api/` or `src/services/` folder (no HTTP layer)
- No `src/models/` folder (no ORM/database models)
- No `src/middleware/` folder (no server)
- No `.env` / `.env.example` (no secrets or environment-specific config exist yet — see [10-setup-and-installation.md](10-setup-and-installation.md#environment-variables))
- No `src/store/` or `redux/` folder (state is Context-based — see [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md))
