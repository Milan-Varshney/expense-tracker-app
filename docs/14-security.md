# 14. Security Considerations

## 14.1 Why there's no authentication or authorization

This is the section a full-stack developer will look for and not find any of. It's a deliberate v1 decision, not an oversight:

- **Single user, single device.** The ADR frames this explicitly as "Personal project, single user." There is no concept of multiple accounts, no login screen, and no session/token of any kind anywhere in the codebase.
- **No backend to authenticate against.** Authentication protects a resource that's shared or remote (a server, a database another user could also reach). Here, the only "resource" is the app's own local `AsyncStorage`, which is already sandboxed by the OS to this one app on this one device (see §14.2) — there's nothing an authentication layer would add protection against that the OS doesn't already provide.
- **Authorization is moot** with only one user and one role — there's no "can user X see user Y's transactions?" question to answer, because there is no user Y.

If this project ever grows a backend or a multi-user feature (see [17-future-improvements.md](17-future-improvements.md) — household expense sharing would require exactly this), authentication/authorization becomes a real, necessary concern at that point, and should be designed then, against the actual requirements of that feature — not retrofitted speculatively now.

## 14.2 Data at rest

- **Where it lives:** `AsyncStorage`, which on Android is backed by SQLite in the app's private data directory, and on iOS by a property-list-backed file in the app's sandbox. In both cases, this directory is **only accessible to this app** under normal OS conditions — another app cannot read it without root/jailbreak access.
- **Is it encrypted?** No. `AsyncStorage` does not encrypt its contents. Anyone with physical access to an unlocked, rooted/jailbroken device (or a device backup that isn't itself encrypted) could potentially read the raw transaction data. For a personal finance app, this is a real (if narrow) exposure — transaction amounts, merchants, and spending patterns are private financial information, even without being "secrets" like a password.
- **What's stored:** merchant names, amounts, dates, categories (see [05-data-model.md](05-data-model.md)). Notably: **no account numbers, no card numbers, no UPI IDs, no PII beyond what the user types into a merchant field.** The app never requests or stores anything more sensitive than a transaction log.
- **Recommended improvement, if this matters more later:** `expo-secure-store` (backed by iOS Keychain / Android Keystore) provides encrypted storage, but it's designed for small values (tokens, keys), not a JSON blob of potentially thousands of transactions — it isn't a drop-in replacement for `AsyncStorage` at this data shape. A more realistic path if encryption-at-rest becomes a requirement: encrypt the JSON blob yourself (e.g. with a device-derived key from `expo-crypto`/`expo-secure-store`) before writing it via `AsyncStorage`, and decrypt on read. Not implemented today — see [17-future-improvements.md](17-future-improvements.md).

## 14.3 Data in transit

**There is none.** The app makes zero network requests — no API calls, no analytics/telemetry pings, no ad SDKs, nothing. This is a direct consequence of the "no backend" architecture (see [03-architecture.md](03-architecture.md)) and is, incidentally, the strongest privacy property this app has: your financial data physically cannot leave your device through this app, because there is no code path that sends it anywhere.

## 14.4 Input handling

- **User input surface:** exactly one form (`AddExpenseScreen`) — free-text `amount`, `merchant`, `date`, and a constrained `category` picker (see [07-frontend-architecture.md](07-frontend-architecture.md#addexpensescreenjs)).
- **Injection risk:** effectively none. There's no SQL (no queries are ever constructed — `AsyncStorage` is a key-value `get`/`set`, not a query interface), no HTML rendering of user input (React Native doesn't render raw HTML/`dangerouslySetInnerHTML` the way a web app could), and no shell/command execution anywhere in the app. The classic web injection categories (SQLi, XSS, command injection) don't have an attack surface in this codebase.
- **What *isn't* validated:** the `merchant` and `notes` free-text fields accept arbitrary strings with no length cap or sanitization. This isn't a security issue today (nothing unsafe is done with that string — it's just rendered as text), but if the app ever renders user-entered strings into something more structured (an exported CSV/PDF, a shared report, a WebView), revisit this — see [05-data-model.md](05-data-model.md#52-the-transaction-entity) and [17-future-improvements.md](17-future-improvements.md).

## 14.5 Dependency security

- `npm audit` (run during setup — see [11-build-and-deployment.md](11-build-and-deployment.md) history) reports moderate-severity advisories in transitive dependencies (typical for any React Native/Expo project's large dependency tree — things like `glob@7`, `inflight`, `uuid@7` deprecation warnings surfaced during installs in this project's history). None of these are in the direct, actively-used dependency list in [02-tech-stack.md](02-tech-stack.md) — they're transitive dependencies of the Expo CLI tooling itself, not of the shipped app bundle, and don't affect the app's runtime security posture. Still, periodically running `npm audit` and `npx expo install --fix` (which also updates to Expo's currently-recommended dependency versions) is good hygiene.
- Since there's no backend, the usual "backend dependency with an RCE" risk category doesn't apply here — the worst-case blast radius of a compromised dependency is limited to what a malicious package could do on the developer's machine during a build, or (if it made it into the shipped app) what it could do within the app's own sandboxed permissions on the user's device.

## 14.6 Permissions

The app currently requests **no special Android/iOS permissions** — no camera, no contacts, no location, no SMS access. This is worth calling out because the ADR's Phase 3 ingestion plan (SMS export, see [17-future-improvements.md](17-future-improvements.md)) explicitly does *not* plan to request raw SMS-reading permission directly within this app (ADR-006: *"a general RN app can't silently read SMS without explicit, user-granted permission and platform restrictions"*) — the plan is an external export step (e.g. a Tasker script) producing a file the user then imports through the same pipeline as a bank statement. If that design ever changes to request SMS permissions directly, treat it as a significant new security/privacy surface requiring its own review (Play Store has strict, narrow-use-case policies specifically around SMS permission grants).

## 14.7 Summary

| Concern | Status |
|---|---|
| Authentication | N/A by design (single user, single device, no backend) |
| Authorization | N/A by design (no multiple users/roles) |
| Data at rest encryption | Not encrypted (standard `AsyncStorage`) |
| Data in transit | N/A — zero network requests |
| Injection risks (SQLi/XSS/command injection) | No attack surface exists for these categories |
| Input validation | Minimal (amount/merchant presence check only); acceptable given the trusted, local-only input source |
| Special permissions requested | None |
| Third-party data sharing | None — no analytics, ads, or telemetry SDKs |
