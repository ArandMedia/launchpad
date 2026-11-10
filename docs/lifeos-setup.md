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
- `20261110203000_add_lifeos_foundation`: the reviewed, additive LifeOS migration;
- `20261110211000_add_lifeos_goal_completed_at`: an idempotent compatibility repair for early LifeOS tables that predate goal completion timestamps;
- `20261110222000_add_lifeos_goal_schedule`: nullable `TIMESTAMPTZ` start/end scheduling for objectives, plus an owner/start index.

The calendar migration is additive. Existing objectives remain unscheduled with null timestamps, no rows are backfilled, and no LaunchPAD project/client data is touched. Precise instants are stored in PostgreSQL and displayed or edited in `America/Chicago`. Builds run `prisma generate && next build` and never mutate the database.

For a fresh database, apply all migrations normally with `npx prisma migrate deploy`.

The production LaunchPAD migration ledger was reconciled during the initial LifeOS release. For each later migration, create a Neon branch from production, run the migration and schema diff there, retain a recovery branch, and then deploy with the direct endpoint:

```sh
npm ci
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

Use the direct, non-pooled database endpoint for migration commands. Do not use `db push`, and do not run production migrations as part of ordinary PR validation.

## Semantic calendar

The primary LifeOS view supports explicit Life → Phase → Year → Quarter → Month → Week → Day → Hour zoom. Breadcrumbs, zoom buttons, adjacent-period controls, time-region buttons, and scheduled goal spans are all keyboard and touch accessible. The internal LaunchPAD navigation shows `LifeOS Calendar` only to the configured owner; direct page and API access remain fail-closed.

Scheduling is optional. New and existing goals may remain unscheduled, while scheduled goals require both a valid start and end with the end after the start. Calendar input is interpreted in `America/Chicago`, including daylight-saving validation, then sent to the API as UTC instants.

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
- optional schedule creation, edit, clear, validation, and UTC/Chicago round trips;
- every semantic zoom level and calendar boundary, including DST gaps;
- owner-only homepage navigation and fail-closed direct access;
- daily AAR creation, same-date update, validation, and reload persistence.

## Manual preview checks

After the migration and owner variable are configured in a non-production preview:

1. Confirm `/lifeos` and `/api/lifeos` deny signed-out users, portal clients, and a non-owner admin.
2. Confirm the configured owner can load the HUD, create a parent and child objective, complete and reopen the child, and reload without losing data.
3. Save a daily AAR, change one answer for the same date, save again, and reload to confirm the update.
4. Traverse Life → Phase → Year → Quarter → Month → Week → Day → Hour, use breadcrumbs and adjacent-period controls, and verify the current period is indicated.
5. Create an unscheduled objective, schedule it, edit its end time, reload, and confirm it appears at broad and narrow calendar scales.
6. Confirm the owner sees `LifeOS Calendar` in the internal homepage navigation and a non-owner does not.
7. Check iPad Safari in portrait and landscape. Controls should remain at least 44px high, form text should remain 16px to avoid focus zoom, and the page should have no horizontal overflow.

Current scope is goals, objective scheduling, the semantic calendar, and daily AARs. It does not include HealthKit, embedded ChatGPT data, task scheduling, automatic sprint rollups, capacity forecasting, or audit logs.
