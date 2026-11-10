# LifeOS setup and verification

LifeOS is private, owner-scoped, and fail-closed. Keep the pull request in draft until the production owner ID and migration window are confirmed. Do not use `prisma db push` for this change.

## Required configuration

Set `LIFEOS_OWNER_USER_ID` to the exact `User.id` of the intended personal account. An email address or the `ADMIN` role is not sufficient. When the variable is absent or does not match the signed team session, both the page and API deny access.

Configure the value separately in each intended Vercel environment. A preview without this setting remains safely inaccessible.

## Runtime security baseline

LaunchPAD runs Next.js 16.4.6 and React 19.3.1. Request cookies, page parameters, and route parameters use the asynchronous APIs required by Next.js 16, and the former middleware is now the supported Node.js `proxy.ts` convention.

`@vercel/blob` is pinned to 2.4.0 because later 2.x releases currently pull an audited-vulnerable OIDC dependency chain that this app does not use. The private `put`, `get`, and `del` APIs used by LaunchPAD remain available. Both the full and production-only `npm audit` checks report zero findings.

## Database migration

The migration history contains:

- `20261110190000_baseline_launchpad`: a generated baseline of the existing schema at commit `00cfebd`, before LifeOS;
- `20261110203000_add_lifeos_foundation`: the reviewed, additive LifeOS migration.

The LifeOS migration creates only `LifeOSGoal` and `LifeOSReview`, plus owner/date indexes. It does not alter or backfill existing LaunchPAD tables. Builds run `prisma generate && next build` and never mutate the database.

For a fresh database, apply both migrations normally with `npx prisma migrate deploy`.

The existing LaunchPAD database predates Prisma migration history. During an approved database change window, first verify that its existing tables match the baseline, then mark only the baseline as already applied before deploying LifeOS:

```sh
npm ci
npx prisma migrate resolve --applied 20261110190000_baseline_launchpad
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Take the normal database backup first. `migrate resolve` records migration metadata; it does not execute the baseline SQL. Never mark the LifeOS migration as applied before its SQL has run. Do not run these commands against production as part of PR validation.

## Local checks

Use a disposable PostgreSQL database, never a production connection:

```sh
npm ci
npm run check
npm run build
```

`npm run check` runs Prisma Client generation, Next.js route type generation, the TypeScript compiler, and the focused Vitest suite.

The verification suite covers:

- fail-closed owner configuration;
- signed-out, client, non-owner admin, and non-owner team sessions;
- portal-domain and internal-domain proxy boundaries;
- owner goal creation, parent validation, completion, reopening, and reload persistence;
- daily AAR creation, same-date update, validation, and reload persistence.

## Manual preview checks

After the migration and owner variable are configured in a non-production preview:

1. Confirm `/lifeos` and `/api/lifeos` deny signed-out users, portal clients, and a non-owner admin.
2. Confirm the configured owner can load the HUD, create a parent and child objective, complete and reopen the child, and reload without losing data.
3. Save a daily AAR, change one answer for the same date, save again, and reload to confirm the update.
4. Check iPad Safari in portrait and landscape. Controls should remain at least 44px high, form text should remain 16px to avoid focus zoom, and the page should have no horizontal overflow.

Current scope is goals and daily AARs. It does not include HealthKit, embedded ChatGPT data, task scheduling, automatic sprint rollups, capacity forecasting, or audit logs.
