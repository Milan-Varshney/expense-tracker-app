# 11. Build & Deployment

## 11.1 Current state

**No build/deployment pipeline is configured yet.** The app has only ever been run in development mode through Expo Go (see [10-setup-and-installation.md](10-setup-and-installation.md)). There is no `eas.json`, no CI workflow, and no distributed `.apk`/`.aab` file produced so far. This section documents the standard path to get there, since it's the natural next step for a personal app you'd want installed permanently on your phone (outside of a dev-server connection).

## 11.2 Why Expo Go isn't a deployment target

Expo Go is a shared client app that dynamically downloads and runs your JS bundle — it's a development convenience, not a distribution mechanism. It requires your phone and dev machine on the same network (or a tunnel), a running Metro server, and is subject to the SDK-compatibility constraints documented in [10-setup-and-installation.md](10-setup-and-installation.md#104-a-real-incident-sdk-version-mismatches). For a real, standalone, always-available app icon on your home screen, you need a **native build** — a real `.apk` (or `.aab` for Play Store) with the JS bundle embedded inside it.

## 11.3 The standard path: EAS Build

Expo's own cloud build service, **EAS (Expo Application Services)**, is the supported way to produce a native binary from a managed-workflow Expo project without installing Android Studio/Xcode locally.

### One-time setup
```bash
npm install -g eas-cli      # or use `npx eas-cli` for every command instead of a global install
eas login                   # requires a free Expo account
cd expense-tracker-app
eas build:configure         # generates eas.json
```

`eas build:configure` will create an `eas.json` with build profiles. A minimal one for this project:
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```
- **`preview`** produces a plain installable `.apk` — the right choice for "put this on my own phone," since it can be sideloaded directly without going through the Play Store.
- **`production`** produces a `.aab` (Android App Bundle) — the format the Play Store requires if this were ever published there.

### Building
```bash
eas build --platform android --profile preview
```
This uploads the project to Expo's build servers, compiles a real native Android project (generated on the fly from `app.json`'s config — this is the "managed workflow" magic: you never see or commit the native `android/` folder), and gives you a download link to a signed `.apk` when done (typically a few minutes).

### Installing the APK
Download the `.apk` to the phone (or `adb install path/to/app.apk` over USB) and install it directly — Android will prompt to allow installs from the source if it's not the Play Store. This is a normal, permanently-installed app icon at that point — no dev server, no Expo Go, no network dependency beyond what the app itself needs (none, since it's fully offline — see [01-project-overview.md](01-project-overview.md)).

## 11.4 App identity for the build

These are already set correctly in `app.json` and will be used by any EAS build automatically:

| Key | Value | Notes |
|---|---|---|
| `expo.name` | `HisabKitab` | Shown under the app icon |
| `expo.slug` | `hisabkitab` | Expo project identifier |
| `expo.version` | `1.0.0` | User-facing version string — bump manually for each release |
| `expo.android.package` | `com.hisabkitab.app` | The Android package ID — **this cannot be changed after the first Play Store upload**, so treat it as fixed |
| `expo.android.edgeToEdgeEnabled` | `true` | Required for the fullscreen/edge-to-edge status bar behavior — see [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md) |

For a `production` build, also set `expo.android.versionCode` (an incrementing integer Play Store requires separately from the semantic `version` string) — `eas.json`'s `"autoIncrement": true` (shown above) handles this automatically on each production build.

## 11.5 Signing

EAS manages a signing keystore for you automatically on the first build (stored securely on Expo's servers, tied to your Expo account) unless you explicitly provide your own. For a personal single-developer project, letting EAS manage it is the simplest correct choice — just don't lose access to the Expo account that owns it, since Play Store updates require signing with the same key every time.

## 11.6 Publishing to the Play Store (if ever desired)

This project has never been published, but the path is:
1. `eas build --platform android --profile production` → produces a `.aab`
2. Create an app entry in the [Google Play Console](https://play.google.com/console) (requires a one-time $25 developer registration fee)
3. Upload the `.aab`, fill in the store listing (screenshots, description, privacy policy — note: even a fully offline app needs a privacy policy URL for Play Store submission, stating that transaction data never leaves the device)
4. Submit for review

This is **not currently planned** per the ADR (this is described as "a personal project, single user"), but the mechanism exists if that changes.

## 11.7 Over-the-air (OTA) updates — not configured, but worth knowing about

Expo supports pushing JS-only updates (no native code changes) directly to installed builds without a new Play Store release, via `expo-updates`. This project does **not** have `expo-updates` installed or configured. If added later, every code change in this repo (aside from native config changes like `app.json`'s Android settings) could be pushed instantly to the already-installed APK. This is listed here as a known, easy future improvement (see [17-future-improvements.md](17-future-improvements.md)) rather than something currently in place.

## 11.8 Continuous Integration

**None exists.** There is no GitHub Actions/CI workflow file in this repo. If you add one, the minimum useful check (given there's no test suite yet — see [12-testing-strategy.md](12-testing-strategy.md)) is a bundling smoke test:
```yaml
# .github/workflows/build-check.yml (illustrative — not currently present)
- run: npm ci
- run: npx expo export --platform android --output-dir /tmp/export-check
```
This catches import errors, syntax errors, and Expo config errors (like the `app.json` plugin gotcha documented in [10-setup-and-installation.md](10-setup-and-installation.md)) on every push, without needing a device or EAS credentials.
