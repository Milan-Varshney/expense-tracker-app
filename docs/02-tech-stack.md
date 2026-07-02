# 2. Technology Stack

Every dependency in `package.json`, and why it's there.

## 2.1 Core platform

### React Native (0.81.5) + React (19.1.0)
**What:** The UI framework. Lets us write one JavaScript/JSX codebase that renders to native Android (and iOS) views instead of a WebView.
**Why:** The ADR's problem statement is inherently mobile (checking spend on the go, adding an expense right after paying). React Native was chosen over a native Kotlin/Swift build because it's a single codebase, and over Flutter because the team's existing familiarity is JS/React.

### Expo (SDK 54, managed workflow)
**What:** A framework and set of tools built on top of React Native that removes almost all native build tooling from the developer's plate — no Android Studio/Xcode project to hand-maintain, no manual native module linking, over-the-air JS updates possible later.
**Why:** Fastest path to a real, installable app without native build tooling. You can develop entirely from a terminal + the Expo Go app on a phone. If a feature later needs a native module Expo doesn't ship (e.g., raw SMS reading for the Phase 3 ingestion plan), the project can "eject" to a bare React Native project without a rewrite.
**Version note:** This project has moved through Expo SDK 57 → 56 → 54 during setup. See [10-setup-and-installation.md](10-setup-and-installation.md#a-real-incident-sdk-version-mismatches) for why — in short, the Expo Go client app on the Play Store lags newly released SDKs by days to weeks, so the project pins to the SDK version Expo Go can actually open.

## 2.2 Navigation

### `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
**What:** The de facto standard routing/navigation library for React Native. `native-stack` uses the platform's real native navigation primitives (`UINavigationController` / Android `Fragment`-based stack) for stack transitions; `bottom-tabs` renders a standard bottom tab bar.
**Why:** The ADR's navigation pattern (bottom tabs + FAB + drill-down + modal add-flow) is a textbook fit for `native-stack` + `bottom-tabs` composed together, and it's the library every React Native app in production uses for this — no reason to hand-roll routing.

### `react-native-screens`, `react-native-safe-area-context`
**What:** Peer dependencies required by React Navigation. `react-native-screens` lets each navigator screen be backed by a native view (better memory/performance than keeping every screen mounted in JS). `react-native-safe-area-context` exposes device safe-area insets (notches, status bars, home indicators) to JS via `useSafeAreaInsets()`.
**Why:** Required, and also directly used throughout this app's screens to pad content correctly under the edge-to-edge status bar (see [15-performance.md](15-performance.md) and [09-data-flow-and-diagrams.md](09-data-flow-and-diagrams.md)).

### `react-native-gesture-handler`
**What:** Provides native-thread gesture recognition (swipes, pans) used internally by React Navigation for stack transitions and swipe-to-go-back.
**Why:** Required by React Navigation; imported once at the very top of `App.js` per the library's setup instructions.

## 2.3 Storage

### `@react-native-async-storage/async-storage`
**What:** An async, persistent, unencrypted key-value store on-device (backed by SQLite on Android, a flat file on iOS).
**Why:** The ADR's decision (ADR-003) was "no backend/API in v1" — everything must persist locally. AsyncStorage is the standard, Expo-compatible choice for this. The entire transaction list is stored as a single JSON-stringified array under one key (see [05-data-model.md](05-data-model.md)) — this is deliberately simple; a real relational or NoSQL on-device database (WatermelonDB, SQLite via `expo-sqlite`) was not needed at this data volume (hundreds, not tens of thousands, of transactions) and would have added complexity for no benefit yet. See [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md).

## 2.4 State management

### React Context + `useState` (no Redux / MobX / Zustand / Recoil)
**What:** `TransactionsContext` and `ThemeContext`, both built from plain `React.createContext` + `useState`/`useCallback`/`useMemo`.
**Why:** The app has exactly two pieces of genuinely global state (the transaction list, and the light/dark mode). Redux-style libraries exist to manage complex, frequently-updated, deeply-normalized state with many independent consumers and middleware needs — none of which applies here. Context is built into React, requires no extra dependency, and is fully sufficient. See [06-state-management-and-internal-api.md](06-state-management-and-internal-api.md) for the full API.

## 2.5 What's deliberately *not* in the stack

| Not used | Why not |
|---|---|
| Redux/MobX/Zustand | Overkill for two pieces of global state (see above) |
| A charting library (Victory, react-native-svg-charts, etc.) | The only chart is a 6-month bar trend on `CategoryDetailScreen`, built with plain `View`s sized by percentage height. Not worth a dependency for one simple bar chart. |
| `@expo/vector-icons` | Not installed in this project; all icons are emoji (🍔🛍️💡🚗🎬🛒✈️❓, plus 🏠📒💡🎯 for tabs). This matches the ADR's icon choices for categories and keeps the dependency list minimal. |
| A date-picker library | `AddExpenseScreen`'s date field is a plain text input pre-filled with today's date (`YYYY-MM-DD`), editable as text. Acceptable for a single-user v1; a proper native date picker is a candidate future improvement. |
| TypeScript | The project is plain JavaScript (`.js` files with JSX). No build-time type checking is configured. This was inherited from the `create-expo-app` blank JS template and not changed; see [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md) for the trade-off. |
| Any backend framework (Express, Fastify, Next.js API routes, etc.) | No backend exists — see [01-project-overview.md](01-project-overview.md) non-goals. |
| Any ORM / database driver | No database exists on a server; AsyncStorage is a client-side key-value store, not queried with SQL from app code. |
| A testing framework (Jest, Detox, etc.) | Not yet installed — see [12-testing-strategy.md](12-testing-strategy.md) for the current state and a recommended setup. |

## 2.6 Tooling

- **Node.js 22.x** — required by Expo SDK 54's tooling (`@expo/cli`). Managed via `nvm`; the project pins this with a `.nvmrc` file containing `22`.
- **npm** — the package manager in use (there's a committed `package-lock.json`; no `yarn.lock` or `pnpm-lock.yaml` present, so don't introduce a second package manager).
- **Metro** — React Native's JS bundler, used transparently by `expo start` / `expo export`. Not configured beyond Expo's defaults (no custom `metro.config.js`).
- **EAS (Expo Application Services)** — not yet configured in this project, but is the standard path to producing a distributable `.apk`/`.aab` outside of Expo Go. See [11-build-and-deployment.md](11-build-and-deployment.md).

## 2.7 Full dependency list (as of this writing)

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-navigation/bottom-tabs": "^7.18.5",
    "@react-navigation/native": "^7.3.5",
    "@react-navigation/native-stack": "^7.17.7",
    "expo": "^54.0.35",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0"
  }
}
```

These exact versions were resolved by `npx expo install --fix`, which pins every package to the version Expo's SDK 54 compatibility table expects. **Do not `npm install` a newer version of any of these individually** — always use `npx expo install <package>` (which consults that compatibility table) or `npx expo install --fix` after changing the `expo` version, otherwise you risk exactly the kind of version-mismatch breakage documented in [10-setup-and-installation.md](10-setup-and-installation.md).
