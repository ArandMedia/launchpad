# LifeOS modular architecture

LifeOS is the private, owner-only operating layer inside LaunchPAD. It is not a second application and does not copy LaunchPAD client or project records.

## Operating model

Every domain uses the same closed loop:

1. Current state — the factual baseline.
2. Desired state — the outcome being pursued.
3. Gap — the constraint between the two states.
4. Active system — routines and operating rules intended to close the gap.
5. Next actions — small executable moves.
6. Evidence — measurements and observations that change a decision.

The six domain boundaries are Health, Wealth, Relationships, Self & Purpose, ArandMedia, and Operation OMNIS. Today is the execution surface, Timeline is the Life-to-Hour planning surface, and Insights is the review/adaptation surface.

## Compatibility and source of truth

- `LifeOSGoal` remains the outcome model. Existing records are classified as `OMNIS` by the additive migration; no record is rewritten or deleted.
- `LifeOSTimeBlock` remains the agenda and calendar execution model.
- `LifeOSReview` remains the daily after-action review model.
- LaunchPAD `Client` and `Project` records remain canonical for ArandMedia. The LifeOS workspace links to them and stores only strategic operating context.
- Domain state, routines, actions, metric definitions, measurements, principles, relationship commitments, periodic reviews, integrations, and audit events are additive owner-scoped records.

## Privacy and data handling

Every query and mutation is scoped to the configured owner ID and fails closed for signed-out, client, and non-owner team sessions. The AAR screen accepts a granular manual health and sleep check-in, keyed by stable metric identifiers so sleep stages, recovery signals, activity, and body measurements remain usable for history and correlation views. Health values and notes are serialized and encrypted with AES-256-GCM before storage in `LifeOSHealthMeasurement`; the record stores ciphertext, a unique IV, and authentication tag. Set `LIFEOS_HEALTH_ENCRYPTION_KEY` to a dedicated secret in production. `SESSION_SECRET` is accepted as a deployment-compatible fallback and is context-derived before use.

The shared LifeOS shell is left-hand friendly: navigation uses a right rail at wide desktop and landscape-tablet widths, while narrower layouts place the navigation above the workspace instead of beside the user's working hand.

Integration records declare scopes, consent state, and retention. A real connection can be disconnected, then its connection record and provider-imported evidence can be deleted. Manual evidence is not included in provider deletion.

## Connector readiness

- Apple Health: requires a private signed iPhone companion that requests HealthKit authorization, exchanges only the approved types, and submits to an authenticated owner endpoint. The web application cannot read HealthKit directly.
- Oura: requires a registered provider application, OAuth callback, encrypted token storage, declared scopes, refresh/revocation handling, and a retention policy.
- Hume: requires a registered provider application, explicit consent, API authorization, declared signal scope, and a retention policy.
- Financial accounts: no provider is selected. Manual evidence is available without implying account connectivity.

No connector displays synthetic provider data or a connected state before authorization exists.

## Release and migration

`prisma migrate deploy` runs against the non-pooled production URL during the Vercel build. The modular migration is additive: it adds goal classification columns and new tables/indexes/foreign keys. It does not drop, rename, or backfill personal content beyond the safe `OMNIS` default for existing goals.
