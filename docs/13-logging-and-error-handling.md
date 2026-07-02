# 13. Logging & Error Handling

## 13.1 Current state

This is a small, local-only app, and its error handling reflects that: it's minimal and concentrated in the two places where something outside the app's control (the OS storage layer) could fail. There is **no logging library, no crash reporting service, and no structured log output** anywhere in the codebase today.

## 13.2 Where errors are currently handled

### `TransactionsContext` initial load
```js
try {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) { setTransactions(JSON.parse(raw)); }
  else { /* seed */ }
} catch (e) {
  setTransactions(SEED_DATA);
} finally {
  setLoading(false);
}
```
**What this handles:** a corrupted or unparseable value in `AsyncStorage` (e.g. `JSON.parse` throwing on malformed JSON), or the storage read itself failing.
**What it does:** silently falls back to the in-memory seed data so the app is never stuck showing an error screen or empty state.
**What it does *not* do:** the caught error `e` is discarded (`catch (e) { ... }` never reads `e`) — there is no log line, no way to know this ever happened, and no attempt to recover the user's actual (corrupted) data. If a user's real transaction history is silently replaced by seed data due to a storage error, they'd only notice because their own entries are missing — there's no signal telling them (or a developer, later, looking at a bug report) why.

### `TransactionsContext.addTransaction` write
```js
AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
```
**What this handles:** a failed write (e.g. the device is out of storage space).
**What it does:** nothing — the promise rejection is swallowed entirely.
**The real consequence:** the in-memory React state (`setTransactions`) already updated optimistically *before* this write is even attempted, so the UI shows the new transaction as saved regardless of whether the write actually succeeded. If the write silently fails, the user believes their expense is saved; it will vanish the next time the app restarts and reloads from (unchanged) `AsyncStorage`. **This is the single most impactful gap in the app's error handling** — see §13.4 for the concrete fix.

### `ThemeContext` write
```js
AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
```
Same pattern, much lower stakes (worst case: the theme preference doesn't persist and resets to dark on next launch — annoying, not data-losing).

## 13.3 Where errors are *not* handled at all

- **`AddExpenseScreen` form validation** — this isn't really an "error" so much as expected user input validation, and it is handled (see [07-frontend-architecture.md](07-frontend-architecture.md#addexpensescreenjs)): a friendly inline message, not a thrown error.
- **`analytics.js` functions** — none of them validate their inputs. Passing `undefined` instead of an array, or a malformed transaction object missing a `date` field, will throw an uncaught `TypeError` (e.g. `.filter` of `undefined`) that propagates up into React's render and would trigger React Native's red error screen in development (or a blank/crashed screen in a production build, since there's no Error Boundary — see §13.5). This is acceptable *only* because every current caller of these functions controls its own input shape (it's always `transactions` from `TransactionsContext`, which is always an array). If `analytics.js` functions are ever called with less-trusted input (e.g. parsed from an imported CSV, per [17-future-improvements.md](17-future-improvements.md)), input validation should be added at that boundary — not scattered defensively through every function, per the project's own convention of "only validate at system boundaries."
- **Navigation errors** — none expected or handled; React Navigation itself throws descriptive errors during development if a route name is misspelled, which is sufficient for this app's size.

## 13.4 Recommended fix: surface storage write failures

The single highest-value change here is making `addTransaction`'s write failure visible instead of silent:

```js
const addTransaction = useCallback(async (transaction) => {
  const next = [{ /* ...new transaction... */ }, ...transactions];
  setTransactions(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    // At minimum: log it. Better: surface a toast/banner to the user
    // ("Couldn't save — check your device storage") and/or roll back
    // the optimistic state update.
    console.error('Failed to persist transaction', e);
  }
}, [transactions]);
```
This alone (even just the `console.error`) would make the failure visible in the Metro dev console during development and in any future crash-reporting integration (see §13.6) without changing the user-facing behavior yet. A more complete fix would surface a visible in-app error and/or retry.

## 13.5 No Error Boundary exists

React (and React Native) will unmount the entire component tree on an uncaught render error unless a class-component `Error Boundary` is in place higher up the tree. This project has none — `App.js` renders `RootNavigator` directly with no boundary wrapping it. In development this doesn't matter much (Expo's red-screen overlay shows the stack trace), but in a production build (see [11-build-and-deployment.md](11-build-and-deployment.md)) an uncaught error anywhere in the render tree would crash to a blank screen with no recovery path for the user. Adding a top-level Error Boundary in `App.js` (rendering a "Something went wrong — restart the app" screen instead of a blank one) is a small, high-value addition before any real-world distribution — see [17-future-improvements.md](17-future-improvements.md).

## 13.6 Logging strategy — recommended, not yet implemented

For a project this size, a full logging framework (Winston-style, log levels, structured JSON logs) would be over-engineering — there's no server to ship logs to. The pragmatic recommendation:

1. **Development:** `console.log`/`console.warn`/`console.error` are sufficient and already visible in the Metro/Expo terminal output and in the Expo Go/dev-client in-app dev menu.
2. **Production crash visibility:** if this app is ever distributed beyond the developer's own phone (see [11-build-and-deployment.md](11-build-and-deployment.md)), add a crash-reporting SDK compatible with Expo managed workflow — `sentry-expo` is the standard choice, requires no native code changes, and would catch exactly the kind of uncaught error described in §13.5 with a real stack trace from a real user's device, which is otherwise completely invisible to the developer.
3. **Don't log sensitive data.** Even though this app has no "secrets" in the traditional sense, transaction data (amounts, merchants) is the user's private financial information — see [14-security.md](14-security.md). Any future logging/crash-reporting integration should be configured to scrub or avoid capturing transaction payloads in log messages/breadcrumbs.

## 13.7 Summary table

| Failure scenario | Currently handled? | Current behavior | Recommended improvement |
|---|---|---|---|
| Corrupted/unreadable stored transactions | Yes (caught) | Silently falls back to seed data | Log the error; consider preserving the raw corrupted string somewhere recoverable instead of discarding it |
| Failed write when adding a transaction | Partially (caught, but swallowed) | UI shows success; data may not actually persist | Log it; surface a user-facing error; consider rolling back optimistic state |
| Failed write when toggling theme | Partially (caught, but swallowed) | Preference silently doesn't persist | Low priority — low impact |
| Malformed transaction object passed to `analytics.js` | No | Throws uncaught, crashes render (dev: red screen; prod: blank screen) | Add an Error Boundary at minimum; validate at the actual untrusted-input boundary if/when one is introduced (e.g. CSV import) |
| Any other uncaught render error | No | Same as above | Add a top-level Error Boundary in `App.js` |
