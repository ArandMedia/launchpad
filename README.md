# LaunchPAD

Internal + client project hub for ArandMedia. One Next.js app, two experiences:

- `/` and `/projects/[id]` — internal team dashboard
- `/[clientSlug]` — client-facing portal (e.g. `/acme-co`)

Both sides share one Postgres database, so an internal update marked
"client-visible" appears on the portal and triggers an email — no syncing
between separate apps.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a Postgres database. Easiest path: Vercel dashboard → Storage →
   Create Database → Postgres (Neon-backed). Copy the connection string.

3. Copy `.env.example` to `.env` and fill in `DATABASE_URL`. For email
   notifications, sign up at resend.com and add `RESEND_API_KEY`.

4. Push the schema:
   ```
   npx prisma migrate dev --name init
   ```

5. Run locally:
   ```
   npm run dev
   ```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (vercel.com/new).
3. Add the same env vars (`DATABASE_URL`, `RESEND_API_KEY`,
   `NOTIFY_FROM_EMAIL`) in Vercel's project settings.
4. Deploy. Point `launchpad.arandmedia.com` at the Vercel deployment
   (Vercel gives you the exact DNS record to add once the domain is
   attached in the project's Domains tab).
5. For the client portal, you can either reuse the same domain
   (`launchpad.arandmedia.com/acme-co`) or attach a second domain like
   `portal.arandmedia.com` and add a rewrite — happy to wire that up
   once you decide.

## What's built vs. what's next

**Built:** data model, internal dashboard + project detail, client
portal with progress + update feed, email notification on client-visible
updates, cursor-paginated project API.

**Not yet built (next passes):** authentication (both team login and
client login), task creation/editing UI (API supports it, no form yet),
SMS notifications, project creation UI. Flagging these explicitly so
nothing here is mistaken for finished — this is the working core to
build the rest on top of.
