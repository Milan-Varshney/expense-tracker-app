# 9. Data Flow & Diagrams

Sequence and flow diagrams for the major user journeys, tied to the exact functions/files involved.

## 9.1 App startup & first-run seeding

```mermaid
sequenceDiagram
    participant OS as Android OS
    participant App as App.js
    participant TC as TransactionsContext
    participant ThC as ThemeContext
    participant AS as AsyncStorage

    OS->>App: launch process, mount <App/>
    App->>ThC: mount ThemeProvider
    ThC->>AS: getItem('@hisabkitab/theme-mode')
    AS-->>ThC: null (first run) or 'dark'/'light'
    ThC->>ThC: setMode(...) if valid value found
    App->>TC: mount TransactionsProvider
    TC->>AS: getItem('@hisabkitab/transactions')
    alt First run (no data yet)
        AS-->>TC: null
        TC->>AS: setItem('@hisabkitab/transactions', SEED_DATA)
        TC->>TC: setTransactions(SEED_DATA)
    else Returning user
        AS-->>TC: JSON string
        TC->>TC: setTransactions(JSON.parse(raw))
    end
    TC->>TC: setLoading(false)
    TC-->>App: transactions[], loading=false available via context
    App->>App: render NavigationContainer → RootNavigator → TabNavigator → HomeScreen
```

**Key detail:** `ThemeProvider` and `TransactionsProvider` load independently and in parallel (two separate `useEffect`s, two separate `AsyncStorage` keys) — neither blocks the other. `HomeScreen` alone waits on `TransactionsContext.loading` before rendering real content (`ThemeContext` has no loading gate — see [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md#62-themecontext-srccontextthemecontextjs)).

## 9.2 Home screen load → insights computed

```mermaid
sequenceDiagram
    participant User
    participant Home as HomeScreen
    participant TC as TransactionsContext
    participant Analytics as analytics.js

    User->>Home: opens Home tab
    Home->>TC: useTransactions() → { transactions, loading }
    Home->>Analytics: getMonthsList(transactions)
    Analytics-->>Home: [{month, total}, ...] descending
    Home->>Home: activeMonth = selectedMonth ?? months[0].month
    Home->>Analytics: filterByMonth(transactions, activeMonth)
    Analytics-->>Home: monthTxns[]
    Home->>Analytics: getCategoryTotals(monthTxns)
    Home->>Analytics: getTopTransactions(monthTxns, 5)
    Home->>Analytics: getRecentTransactions(transactions, 2)
    Home->>Analytics: getMonthOverMonthDelta(transactions, activeMonth)
    Home->>Analytics: generateInsights(transactions, activeMonth)
    Analytics-->>Home: Insight[] (evaluates 4 rules per category, see doc 08)
    Home->>Analytics: getUpcomingRenewals(transactions)
    Analytics-->>Home: Renewal[]
    Home->>Home: render TotalCard, InsightBanner(insights[0]),\nQuickAddChips, TransactionRow lists, CategoryBar list
```

Every one of these `analytics.js` calls is wrapped in `useMemo` with `[transactions, activeMonth]` (or a subset) as dependencies — so switching the selected month recomputes everything, but a re-render caused by something unrelated (e.g. the theme toggling) does **not** recompute analytics, it only re-renders with the same memoized values.

## 9.3 Adding an expense

```mermaid
sequenceDiagram
    participant User
    participant Home as HomeScreen
    participant Nav as React Navigation
    participant Add as AddExpenseScreen
    participant TC as TransactionsContext
    participant AS as AsyncStorage

    User->>Home: taps FAB (+) or a quick-add chip
    Home->>Nav: navigate('AddExpense'[, {category}])
    Nav->>Add: push modal screen
    Add->>Add: initialCategory = params?.category ?? CATEGORY_LIST[0]
    User->>Add: fills amount, merchant, date, picks category
    User->>Add: taps "Save expense"
    Add->>Add: handleSubmit(): validate amount>0 and merchant non-empty
    alt invalid
        Add->>Add: setError('Enter a valid amount and merchant.')
    else valid
        Add->>TC: addTransaction({amount, merchant, category, date, source: 'Manual'})
        TC->>TC: setTransactions(prev => [newTxn, ...prev])
        TC->>AS: setItem('@hisabkitab/transactions', JSON.stringify(next))
        Add->>Nav: goBack()
        Nav->>Home: pop modal, Home re-renders (subscribed to TransactionsContext)
        Home->>Home: all analytics.js derivations recompute\nwith the new transaction included
    end
```

**Why the UI updates immediately without an explicit "refresh":** `HomeScreen` (and every other screen) reads `transactions` via `useTransactions()`. Calling `setTransactions` inside `addTransaction` triggers a React re-render of every component subscribed to that context — there's no manual cache invalidation or refetch step, because there's no cache separate from the live state.

## 9.4 Category drill-down

```mermaid
sequenceDiagram
    participant User
    participant Home as HomeScreen
    participant Nav as React Navigation
    participant Detail as CategoryDetailScreen
    participant Analytics as analytics.js

    User->>Home: taps a category row (CategoryBar)
    Home->>Nav: navigate('CategoryDetail', {category})
    Nav->>Detail: push screen, route.params.category available
    Detail->>Analytics: getCategoryTrend(transactions, category, 6)
    Analytics-->>Detail: [{month, total}, ...] ascending, 6 months
    Detail->>Analytics: getMerchantBreakdown(transactions, category)
    Analytics-->>Detail: [{merchant, total}, ...] descending
    Detail->>Detail: render TrendChart (hand-rolled bar chart)\n+ merchant list
```

## 9.5 Theme toggle

```mermaid
sequenceDiagram
    participant User
    participant Home as HomeScreen
    participant ThC as ThemeContext
    participant AS as AsyncStorage
    participant Nav as NavigationContainer
    participant SB as StatusBar

    User->>Home: taps ☀️/🌙 toggle button
    Home->>ThC: toggleTheme()
    ThC->>ThC: setMode(prev => prev === 'dark' ? 'light' : 'dark')
    ThC->>AS: setItem('@hisabkitab/theme-mode', next)
    ThC-->>Home: new colors object (mode === 'dark' ? dark : light)
    Note over Home: every screen/component calling useTheme()\nre-renders with the new palette
    ThC-->>Nav: AppContent recomputes navigationTheme from new colors
    ThC-->>SB: <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
```

This is a full-tree re-render (every mounted screen/component using `useTheme()` re-renders), which is fine here because it's a deliberate, infrequent, whole-app visual change — not something to optimize away. See [15-performance.md](15-performance.md).

## 9.6 End-to-end: from a tap to a persisted byte on disk

To make the "no backend" architecture completely concrete, here is literally everything that happens between the user tapping "Save expense" and the data being durable:

```mermaid
flowchart LR
    A["User taps\n'Save expense'"] --> B["AddExpenseScreen.handleSubmit()\n(JS, in-memory, synchronous)"]
    B --> C["TransactionsContext.addTransaction()\n(JS, in-memory, synchronous state update)"]
    C --> D["AsyncStorage.setItem()\n(async bridge call to native module)"]
    D --> E{Platform}
    E -->|Android| F["SQLite database file\nmanaged internally by AsyncStorage"]
    E -->|iOS| G["Flat file on disk\nmanaged internally by AsyncStorage"]
```

There is no network hop anywhere in this diagram — this is the entire persistence story for the app.

## 9.7 Where to go next

- The exact business rules driving §9.2 and §9.4's computations: [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md)
- The full Context/function API referenced throughout these diagrams: [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md)
- Why re-renders here are cheap enough not to worry about: [15-performance.md](15-performance.md)
