# LifeOS setup and verification

This work is in a draft pull request. Do not merge until it passes build, auth and database tests.

1. Set `LIFEOS_OWNER_USER_ID` in the Vercel environment to the exact `User.id` of the intended personal account. Never use an email match or the ADMIN role alone. Without this variable, LifeOS denies access.
2. Review the Prisma schema additions and create a reviewed database migration. The existing package build script runs `prisma db push --accept-data-loss`, which is **not suitable for an unreviewed production schema change**. Remove this dangerous build-time schema push before merging or deploying.
3. Run `npx prisma generate`, `npx tsc --noEmit`, and `npm run build` in a safe test environment with an isolated database. Verify `/lifeos` and `/api/lifeos` on both internal and portal hostnames.
4. Confirm another ADMIN cannot view or change the LifeOS owner's goals or reviews. Confirm signed-out requests fail. Confirm a logged-in client cannot access any LifeOS routes.
5. Verify goal creation, parent linking, completion, AAR save/upsert, and persistence after reload on iPad Safari.
6. Deploy to preview first and inspect the result before promoting to production.

Current scope: basic goals and daily AARs. Not yet included: task scheduling, automatic sprint rollups, capacity forecasting, HealthKit, ChatGPT two-way connector, audit logs, or automated tests. No live deployment has been verified.
