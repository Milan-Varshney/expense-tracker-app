# 10. Setup & Installation

## 10.1 Prerequisites

| Requirement | Version | Why |
|---|---|---|
| Node.js | **22.x** (project pins this in `.nvmrc`) | Expo SDK 54's CLI tooling requires it. See §10.4 for what goes wrong on older Node. |
| npm | Bundled with Node 22 (v10.x) | The project's lockfile is `package-lock.json`; don't introduce yarn/pnpm. |
| A phone with the **Expo Go** app installed (Android or iOS), OR an Android/iOS emulator | Latest available on the Play Store / App Store | Expo Go is the fastest way to run the app without building a native binary. See §10.4 for the SDK-compatibility caveat. |
| `nvm` (Node Version Manager) | any recent version | Recommended so you can switch to Node 22 without disturbing other projects on your machine. |

There is **no** requirement for Android Studio, Xcode, a JDK, or any native SDK to *develop* this app day-to-day — that's the whole point of Expo's managed workflow (see [02-tech-stack.md](02-tech-stack.md)). You only need those for the native-build path described in [11-build-and-deployment.md](11-build-and-deployment.md).

## 10.2 Environment variables

**There are none.** This is worth stating explicitly rather than leaving a new developer hunting for a `.env.example` that doesn't exist:

- No API keys (no backend, no third-party APIs called)
- No database connection strings (no database)
- No secrets of any kind
- No per-environment config (dev/staging/prod) — there is only one build target

If the project later adds a real backend integration, a CSV/PDF parsing service, or crash reporting (see [17-future-improvements.md](17-future-improvements.md)), that's when `.env` + `app.config.js` (Expo's dynamic config, which can read `process.env` at build time) would first become necessary. Until then, all configuration is static code in `app.json` and `src/constants/`.

## 10.3 Installing and running locally

```bash
# 1. Get the right Node version
nvm install       # reads .nvmrc automatically, installs Node 22 if you don't have it
nvm use

# 2. Install dependencies
cd expense-tracker-app
npm install

# 3. Start the dev server
npx expo start
```

`expo start` prints a QR code in the terminal. Scan it with the Expo Go app on your phone (Android: use the in-app QR scanner in Expo Go; iOS: use the system Camera app). The app bundles over your local network and launches.

**Useful variants:**
```bash
npx expo start -c          # clear the Metro bundler cache — use this whenever something seems stale
npm run android             # start + attempt to open directly in a connected Android emulator/device
npm run ios                 # start + attempt to open in the iOS simulator (macOS only)
npm run web                 # NOT currently usable — see note below
```

**Note on `npm run web`:** the `web` script exists in `package.json` (inherited from the Expo template) but `react-dom` and `react-native-web` are **not installed** in this project, so it will fail with a missing-dependency error unless you first run `npx expo install react-dom react-native-web`. Web was never a target platform for this app (see [01-project-overview.md](01-project-overview.md)) — this was only ever used ad hoc during development to sanity-check the JS bundle (see §10.5), not as a supported way to run the app.

## 10.4 A real incident: SDK version mismatches (read this before you file a bug)

This exact problem was hit and solved during this project's initial setup — documenting it here so it isn't rediscovered the hard way.

**Symptom:** `expo start`, scan the QR code, Expo Go shows an error like *"This project requires a newer version of Expo Go"* or *"Incompatible SDK version"* — the app never opens.

**Root cause:** Expo ships a new SDK version periodically (this project has been on 57, then 56, then settled on 54). The **Expo Go client app** published on the Play Store/App Store only supports a specific, narrower range of SDK versions at any given time, and it typically **lags a brand-new SDK release by days to weeks** — so a project scaffolded with the very latest `create-expo-app` can easily be too new for the Expo Go app currently installable from the store, *even after updating Expo Go*.

**How to check what your installed Expo Go actually supports**, without guessing:
```bash
curl -s https://api.expo.dev/v2/versions/latest | python3 -c "
import json, sys
data = json.load(sys.stdin)['data']
print('Expo Go currently supports SDK:', data.get('expoGoSdkVersion'))
"
```
This project discovered its Expo Go supported only SDK 54 this way, after 56 (a seemingly safe one-version downgrade from 57) still failed.

**The fix, step by step (what this project's `package.json` reflects today):**
```bash
# 1. Pin the exact SDK Expo Go supports
npm install expo@^54.0.0

# 2. Let Expo realign every other dependency to that SDK's compatibility table
npx expo install --fix

# 3. If `expo install --fix` leaves node_modules in a half-updated, conflicting state
#    (it can, if you were jumping between SDK versions in the same session — this happened
#    while debugging this exact issue), nuke and reinstall clean:
rm -rf node_modules package-lock.json
npm install
```

**A second-order gotcha that also bit this project:** after downgrading the SDK, `app.json` still had a leftover `"plugins": ["expo-status-bar"]` entry that a *different* SDK version's `expo install --fix` had auto-added. That plugin format isn't valid for the older `expo-status-bar` version SDK 54 resolves to, and it broke the Metro bundle with a cryptic `PluginError: Unable to resolve a valid config plugin`. **Lesson:** after any SDK version change, diff `app.json` and remove anything you don't recognize adding yourself.

**A third gotcha:** if you had a `expo start` dev server already running from *before* you made any of these fixes, it keeps serving the **old**, cached SDK manifest to your phone — the fix won't visibly take effect until you kill that process and start a fresh one:
```bash
# find and kill any stale dev server
ps aux | grep "expo start" | grep -v grep
kill <pid> <pid> <pid>

# restart clean, clearing the Metro cache too
npx expo start -c
```
Also **fully close** Expo Go on your phone (swipe it away, don't just background it) before rescanning — it can cache the old manifest on its side as well.

**How to avoid this going forward:** don't manually bump the `expo` version in `package.json` to "latest" without first checking `expoGoSdkVersion` via the command above (unless you're building a standalone binary via EAS instead of using Expo Go — see [11-build-and-deployment.md](11-build-and-deployment.md), where this constraint doesn't apply since there's no Expo Go client involved at all).

## 10.5 Verifying the app without a phone/emulator

If you just need to confirm the JS bundles without any errors (e.g. in CI, or before handing off a change), you don't need a device at all:

```bash
npx expo export --platform android --output-dir /tmp/hisabkitab-export-check
```

This runs the full Metro bundling pipeline (module resolution, JSX/Babel transform, asset collection) and writes the output bundle to disk, without needing Expo Go, an emulator, or a device. A clean run prints something like:
```
Android Bundled 6156ms index.js (947 modules)
```
with no errors. This was used repeatedly during development to catch import errors, syntax errors, and config-plugin errors (like the `app.json` gotcha in §10.4) before ever touching a physical device.

## 10.6 First-run experience

On the very first launch (no prior `AsyncStorage` data), the app seeds itself with ~6 months of realistic demo data (see [05-data-model.md](05-data-model.md#54-the-seed-dataset)) — you'll see a populated dashboard with real-looking insights immediately, not an empty state. To reset back to this first-run state on a device, clear the app's storage (Android: Settings → Apps → Expo Go → Storage → Clear Data — note this clears storage for **all** Expo Go-hosted projects, since they share one app; there is no per-project way to do this from within Expo Go) or simply change the `STORAGE_KEY` constant in `TransactionsContext.js` temporarily.
