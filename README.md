# Car Care

A bilingual (Arabic / English) car care app: track fuel fill-ups, maintenance, expenses and car documents, and get reminded before service or paperwork is due.

Built with **Expo (SDK 57) + Expo Router**, backed by a **Supabase** database. Targets iOS, Android and the web. The web version is deployed and in use; the native builds have not been tested yet (see [Native builds](#native-builds)).

## Features

- **Garage** – several vehicles per user; make, model, year and color picked from lookup lists (Arabic and English names), with an "Other" option for anything missing. Vehicles can be edited or deleted from Settings.
- **Home** – current mileage, spending this month, the most urgent due item, car document status, quick add and recent activity.
- **Add records**
  - Maintenance: service / part from a catalog, workshop, cost, next-due km
  - Fuel: liters, cost, station, fuel type, full-tank flag
  - Expenses: insurance, registration, parking, fines, wash, tolls, …
  - Optional receipt photos or PDFs on any record
- **History** – every record for the selected vehicle, newest first. Tap a record to edit it, view or remove its files, or delete it.
- **Insights** – this year's spend, distance, spend per category and fuel economy (L/100 km).
- **Car documents** – insurance card and vehicle license (Istimara) with number, insurer, expiry date and card photos. Expiry dates create reminders.
- **Reminders** – worked out in the database from service intervals and document expiry dates, and kept correct when services are edited or deleted. Home shows the most urgent one; tap it for the full list, where a reminder can be dismissed.
- **Settings** – vehicles, language, currency (SAR, AED, KWD, QAR, BHD, OMR, JOD, EGP, USD, EUR), support and privacy links, sign out, and permanent account deletion.
- **Arabic / English** with right-to-left layout, light and dark mode.

## Tech stack

| Area | Choice |
| --- | --- |
| App | Expo SDK 57, React Native 0.86, React 19, Expo Router (file-based routes, typed routes) |
| Data | Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js`, TanStack Query |
| Session storage | `expo-sqlite/localStorage` on native, browser `localStorage` on web |
| i18n | `i18next`, `react-i18next`, `expo-localization` |
| Files | `expo-image-picker`, `expo-document-picker`, `expo-file-system` |
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
      settings.tsx            Vehicles, language, currency, sign out
  components/                 Screen shell, header, cards, form controls (ui/)
  features/                   Data access per domain (Supabase + TanStack Query)
    vehicles/  records/  documents/  profile/
  i18n/                       i18next setup and ar / en translations
  lib/                        Supabase client, formatting, dates, numbers, file reading
  providers/                  Session and active vehicle context
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

## Native builds

The iOS and Android apps have not been built or tested yet. Native-only parts (tab bar icons, date picker, camera and file pickers, right-to-left switching) are unverified.

- Local development build: `npx expo run:ios` / `npx expo run:android`
- Cloud builds with [EAS Build](https://docs.expo.dev/build/introduction/) are not configured yet. Set them up once with `npx eas-cli@latest build:configure` (creates `eas.json` and links an Expo project), then `npx eas-cli@latest build`.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Bad Gateway` on the deployed site | The domain or exposed port is not `80` in Coolify. |
| `name resolution failed` (503) when signing in | The Supabase auth container is down. Restart the Supabase service. |
| `Email not confirmed` | Turn on auto-confirm or confirm the user in SQL (see step 4). |
| `Invalid login credentials` | Wrong password. Reset it from Supabase → Authentication → Users. |
| `Could not find the table … in the schema cache` | Migration not run yet, or run `notify pgrst, 'reload schema';`. |
| Code changes not showing in the dev server | Install Watchman or restart with `npx expo start --clear`. |
