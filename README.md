# Car Care · العناية بالسيارة

**English** | [العربية](README.ar.md)

A bilingual (Arabic / English) car care app: log fuel fill-ups, maintenance and expenses for every car you own, keep the car's documents in one place, and get reminded before a service or a document is due.

Built with **Expo (SDK 57) + Expo Router** on a **Supabase** backend. One codebase runs on iOS, Android and the web.

| Platform | Status |
| --- | --- |
| Web | Live at [carcare.ardalsharq.com](https://carcare.ardalsharq.com) (Docker + nginx on Coolify) |
| iOS | Built with Xcode 27 and submitted to the App Store (bundle ID `com.ardalsharq.carcare`) |
| Android | Configured (package `com.ardalsharq.carcare`), not built or tested yet |

## Features

### Account and access
- Email and password sign-up and sign-in; the session persists across app launches.
- **Account deletion** inside the app (Settings → Account → Delete account). Uploaded files are removed first, then the account and all of its data are deleted permanently.
- Each user only ever sees their own data (Postgres row-level security on every table and a private storage bucket).

### Garage (vehicles)
- Several vehicles per user, with a vehicle switcher at the top of every tab; the selected car is remembered.
- **Make and model** picked from searchable lookup lists (34 makes, 238 models, Arabic and English names), with "Other" to type anything missing.
- **Year** and **color** pickers (15 colors with swatches), plate number, fuel type, tank capacity and starting odometer.
- Edit or delete a vehicle from Settings; deleting removes all of its records, documents and files.

### Records
Add a record from the Add tab or the Home quick-add buttons. Tap any record in History or Recent activity to edit it, view or remove its files, or delete it.

- **Maintenance** – service or part from a catalog of 26 items (engine oil, filters, brake pads, tires, battery, …), date, odometer, **spare parts cost and labor cost** (the total is calculated), workshop, optional next-due km and notes.
- **Fuel** – fuel type, date, odometer, total cost and **price per liter**; liters are calculated automatically (cost ÷ price). The price is prefilled from the car's last fill-up of the same fuel type, or Aramco prices (91: 2.18, 95: 2.33, diesel: 1.66 SAR). Station and full-tank flag.
- **Expenses** – insurance, registration, inspection, parking, fines, car wash, tolls and other, with amount, date, optional odometer and notes.
- **Attachments** – receipt photos (gallery or camera) or PDFs on any record: up to 5 files, 10 MB each, stored privately.
- **Odometer checks** – a reading lower than an earlier one (or higher than a later one) is rejected with a clear message; the car's current mileage always follows the latest reading.
- Numbers can be typed with Arabic-Indic digits (٠١٢…) and the Arabic decimal separator.

### Home
- Current mileage and **spending this month**.
- **Monthly budget** per car (set in the vehicle's edit screen): spent vs. budget with a progress bar that turns orange at 80% and red when over, plus a month-end projection at the current pace.
- The most urgent reminder (overdue, due soon or next), linking to the full reminders list.
- **Car documents** cards with their status: valid until …, expires in N days (highlighted 30 days ahead), expired, or not added.
- Quick add for maintenance and fuel, and the 3 latest records.

### History
- Every fuel, maintenance and expense record of the selected car in one list, newest first, with icon, date, odometer, liters, place and amount.

### Insights (this year)
- Total spend and distance driven.
- Spending by category (spare parts, labor, fuel, other expenses) with bars.
- Average fuel economy over the last 12 months in L/100 km, calculated between full-tank fill-ups.

### Tools (from Insights)
- **Fuel analysis** – last 12 months: average consumption, average price per liter, fuel cost per km, charts of consumption and price per fill-up (tap a bar for its value, dashed line = average), stations ranked by price, and a warning with tips when the latest fill-up uses 15%+ more fuel than usual.
- **Export and reports** – choose this month, last month, this year, last year or all time:
  - **PDF report** (summary, spending by category, every record; right-to-left in Arabic) shared via the share sheet, or printed / saved as PDF on the web.
  - **Excel (CSV)** of every record (UTF-8 so Arabic opens correctly in Excel), shared on the phone or downloaded on the web.
- **Compare cars** – cost per km, fuel consumption, spending this year and distance driven per car, with the best value marked.

### Reminders
- Created automatically in the database:
  - **Parts** – from the part's default interval in km and/or months (e.g. engine oil every 10,000 km or 6 months) or the next-due km entered on the record; recalculated when a service is edited or deleted.
  - **Documents** – from the insurance and vehicle license expiry dates.
- Status per reminder: overdue, due soon (within 1,000 km or 30 days) or on track, with km / days left.
- Full list on the Reminders screen; a reminder can be dismissed until the part is serviced again or the document renewed.

### Car documents
- **Insurance card** – insurance company (17 Saudi insurers or "Other"), policy number, expiry date, notes and card photos.
- **Vehicle license (Istimara)** – serial number, expiry date, notes and card photos.

### Settings
- Vehicles (edit / delete / add), language, currency (SAR, AED, KWD, QAR, BHD, OMR, JOD, EGP, USD, EUR), Support and Privacy policy links, sign out and account deletion.

### Look and language
- Arabic and English with full right-to-left layout; the app restarts once when the direction changes.
- Western digits for numbers in both languages; Arabic plates display correctly next to Latin text.
- Green "Car Care" design in light and dark mode, native tab bar on iOS / Android and a matching bottom bar on the web.
- In-app confirmation dialogs (not system alerts) for anything destructive.

### Website pages
- `/support/` and `/privacy/` – static Arabic + English pages served with the web app (from `public/`), used for the App Store listing.

## Tech stack

| Area | Choice |
| --- | --- |
| App | Expo SDK 57, React Native 0.86, React 19, Expo Router (file-based routes, typed routes) |
| Data | Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js`, TanStack Query |
| Session storage | `expo-sqlite/localStorage` on native, browser `localStorage` on web |
| i18n | `i18next`, `react-i18next`, `expo-localization` |
| Files | `expo-image-picker`, `expo-document-picker`, `expo-file-system` |
| Export | `expo-print` (PDF), `expo-sharing` (share sheet) |
| Web deploy | Static export (`expo export --platform web`) served by nginx in Docker |

## Getting started

### 1. Prerequisites

- Node.js 20 or newer and npm
- A Supabase project (hosted or self-hosted)
- Optional: [Watchman](https://facebook.github.io/watchman/) (`brew install watchman`). Without it, the dev server sometimes misses file changes.

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy the example file and fill in values from **Supabase → Project Settings → API**:

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-host
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Use the **anon / publishable** key only, never the `service_role` key. `.env.local` is git-ignored.

### 4. Set up the database

In the Supabase **SQL Editor**, run these files in order:

| File | What it creates |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Core tables (profiles, vehicles, odometer, fuel, maintenance, expenses, reminders, attachments), triggers, reporting views, row-level security, storage buckets |
| `supabase/seed.sql` | Service / part catalog (26 items with default intervals) |
| `supabase/migrations/0002_vehicle_lookups.sql` | Vehicle make / model lookups (34 makes, 238 models) |
| `supabase/migrations/0003_vehicle_documents.sql` | Insurance card and vehicle license documents, expiry reminders |
| `supabase/migrations/0004_reminder_recalc.sql` | Recalculates part reminders when maintenance is edited or deleted |
| `supabase/migrations/0005_delete_account.sql` | `delete_my_account()` for in-app account deletion |
| `supabase/migrations/0006_vehicle_budget.sql` | Optional monthly budget per vehicle (required by the app from this version) |

All reporting numbers come from database views: `v_vehicle_summary` (month / year / 12-month totals, cost per km, fuel economy), `v_monthly_costs`, `v_all_costs`, `v_fuel_stats`, `v_part_history` and `v_upcoming_maintenance`.

Every script can be run again safely.

If the app reports `Could not find the table … in the schema cache` after a migration, reload the API schema:

```sql
notify pgrst, 'reload schema';
```

**Email confirmation.** Supabase requires new users to confirm their email by default. Without a mail (SMTP) server configured, confirmation emails are never sent. For development:

- Self-hosted: set `ENABLE_EMAIL_AUTOCONFIRM=true` (or `GOTRUE_MAILER_AUTOCONFIRM=true` on the auth container) and restart Supabase.
- Hosted: Authentication → Providers → Email → turn off "Confirm email".
- Or confirm existing users manually:

  ```sql
  update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
  ```

### 5. Run

```bash
npx expo start          # dev server (press i / a / w for iOS / Android / web)
npm run web             # web only
```

Native modules (image picker, document picker, date picker, SQLite) need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) rather than Expo Go:

```bash
npx expo run:ios
npx expo run:android
```

If a code change doesn't appear, restart with a clean cache: `npx expo start --clear`.

### Checks

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
```

## Project structure

```
src/
  app/                        Routes (Expo Router)
    _layout.tsx               Providers, auth guard, splash screen
    sign-in.tsx               Sign in / create account
    (app)/                    Signed-in area
      _layout.tsx             Stack + active vehicle provider
      (tabs)/                 Home, History, Add, Insights
      vehicles/new.tsx        Add vehicle (modal)
      vehicles/[id].tsx       Edit / delete vehicle
      records/[kind]/[id].tsx Edit / delete a record
      documents/[type].tsx    Insurance card / vehicle license
      reminders.tsx           All reminders
      settings.tsx            Vehicles, language, currency, help links, account
      fuel.tsx                Fuel analysis
      export.tsx              PDF / CSV export
      compare.tsx             Compare cars
  components/                 Screen shell, header, cards, record / vehicle forms, ui/ controls
  constants/                  Theme colors and sizes, website URLs
  features/                   Data access per domain (Supabase + TanStack Query)
    vehicles/  records/  documents/  profile/
  i18n/                       i18next setup and ar / en translations
  lib/                        Supabase client, formatting, dates, numbers, file reading
  providers/                  Session, active vehicle, confirmation dialog
plugins/
  with-scene-lifecycle.js     Config plugin: UIKit scene life cycle (required by the iOS 27 SDK)
public/
  support/  privacy/          Static website pages
supabase/
  migrations/                 SQL migrations (run in order)
  seed.sql                    Part catalog
```

Files ending in `.web.tsx` / `.web.ts` replace their native counterpart on the web (tab bar, date input, storage, file reading).

## Deploying the web app (Coolify / Docker)

The `Dockerfile` exports the app as a static single-page app and serves it with nginx on **port 80** (`nginx.conf` sends every route to `index.html`).

In Coolify:

1. **Build pack:** Dockerfile. **Ports Exposes:** `80`. The domain's port must also be `80`.
2. **Environment variables:** add both of these with **Build time** on (they are compiled into the JavaScript bundle):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy. After changing a variable, **redeploy**. A restart does not rebuild the bundle.

Build and run locally with Docker (not yet tried outside Coolify):

```bash
docker build \
  --build-arg EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-host \
  --build-arg EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key \
  -t car-tracker-web .
docker run -p 8080:80 car-tracker-web
```

## iOS builds and App Store releases

The `ios/` folder is generated (Continuous Native Generation) and git-ignored. Never edit it by hand: change `app.json` or a config plugin, then regenerate.

```bash
npx expo prebuild --platform ios --clean   # regenerate ios/ from app.json (run from the project root)
npm run ios                                # build and run on a simulator
```

To release a new build:

1. Raise `expo.ios.buildNumber` in `app.json` (for a new App Store version, change `expo.version` and reset `buildNumber` to `1`).
2. Regenerate with `npx expo prebuild --platform ios --clean` (quit Xcode first).
3. Open `ios/CarCare.xcworkspace`, choose your team under Signing & Capabilities, then **Product → Archive** and **Distribute App → App Store Connect → Upload**.

Notes:
- `plugins/with-scene-lifecycle.js` adopts `ExpoAppSceneDelegate`; without it apps built with Xcode 27 fail to launch with "UIScene life cycle is required".
- "Upload Symbols Failed" warnings for prebuilt frameworks (React, ExpoImage) are harmless.
- "You do not have required contracts" means an agreement is waiting in the Apple Developer account / App Store Connect → Business.
- Android: `npx expo run:android` locally; cloud builds with [EAS Build](https://docs.expo.dev/build/introduction/) are not configured yet (`npx eas-cli@latest build:configure`).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Bad Gateway` on the deployed site | The domain or exposed port is not `80` in Coolify. |
| `name resolution failed` (503) when signing in | The Supabase auth container is down. Restart the Supabase service. |
| `Email not confirmed` | Turn on auto-confirm or confirm the user in SQL (see step 4). |
| `Invalid login credentials` | Wrong password. Reset it from Supabase → Authentication → Users. |
| `Could not find the table … in the schema cache` | Migration not run yet, or run `notify pgrst, 'reload schema';`. |
| Code changes not showing in the dev server | Install Watchman or restart with `npx expo start --clear`. |
