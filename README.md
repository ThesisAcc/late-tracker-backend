# Office Late Checker — Backend

## Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL and DIRECT_URL from your Neon project, and JWT_SECRET
npx prisma migrate dev --name init
npm run dev
```

The initial migration is followed by a migration that adds database CHECK
constraints for non-negative late minutes and valid month/year ranges. Run
`npx prisma migrate deploy` in production to apply all committed migrations.

## Creating the first admin

There's no self-registration by design. Insert the first admin directly,
e.g. via a one-off script or `npx prisma studio`:

```js
const bcrypt = require('bcrypt');
const prisma = require('./src/lib/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('1234', 10); // pick a real 4-digit PIN
  await prisma.user.create({
    data: { email: 'admin@yourcompany.com', passwordHash, role: 'ADMIN' },
  });
}
main().then(() => process.exit(0));
```

## Neon connection strings

Neon gives you two connection strings:
- A **pooled** one (via PgBouncer) — use this for `DATABASE_URL`, the one the
  running app uses for normal queries.
- A **direct** one — use this for `DIRECT_URL`, which Prisma needs specifically
  for running migrations (migrations don't work reliably through the pooler).

Both go in Render's environment variables, not just `.env` locally.

## Deploying to Render

1. Push this repo to GitHub.
2. Create a new **Web Service** on Render, pointing at the repo.
3. Build command: `npm install` (this also runs `prisma generate` via `postinstall`).
4. Start command: `npm start`.
5. Add environment variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV=production`.
6. Before first traffic, run `npx prisma migrate deploy` against the Neon DB —
   either as a Render "Pre-Deploy Command" (if your plan supports it) or manually
   once from your machine with `DATABASE_URL`/`DIRECT_URL` pointed at Neon.
7. Hit `GET /health` after deploy to confirm the app can reach Neon.

## What's implemented so far

- DB connection (Prisma + Neon) with a `/health` check
- Swagger UI at `/api-docs` and the OpenAPI document at `/api-docs.json`
- `POST /api/auth/login` — email + 4-digit PIN, rate-limited (8 attempts / 15 min)
- `POST /api/admin/employees` — admin-only, creates Employee + User together
- `GET/PATCH /api/admin/employees` — admin-only listing/detail/status update

## Not yet implemented (per the original instructions)

Employee's own attendance view, Excel import pipeline, import history/issues.
