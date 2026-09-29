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

## Tests

```bash
npm test
```

Uses Node's built-in test runner, so there is no test framework to install.
Coverage is deliberately limited to logic that needs no database: error
mapping, auth/role middleware, request validation, config parsing and PIN
generation. The login and employee CRUD flows talk to Postgres and are not
covered here — exercise those against a Neon test branch.

## Configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | always | Pooled connection string. |
| `DIRECT_URL` | for migrations | Direct (non-pooled) connection string. |
| `JWT_SECRET` | always | |
| `JWT_EXPIRES_IN` | no | Defaults to `8h`. |
| `CORS_ORIGIN` | in production | Comma-separated allowlist. The app refuses to boot in production without it. |
| `PORT` | no | Defaults to `3000`. |

`CORS_ORIGIN` is deliberately *not* defaulted in production. The `cors`
package treats an array as a literal allowlist, so a fallback of `["*"]`
matches no origin at all — it fails closed and silently breaks every browser
request, which is far harder to notice than a startup error.

## Creating the first admin

There's no self-registration by design. Insert the first admin directly,
e.g. via a one-off script or `npx prisma studio`:

```js
const bcrypt = require('bcrypt');
const prisma = require('./src/lib/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('1234', 10); // pick a real 4-digit PIN
  await prisma.user.create({
    data: {
      employee: {
        create: {
          employeeCode: 'EMP-1000',
          firstName: 'System',
          lastName: 'Administrator',
        },
      },
      passwordHash,
      role: 'ADMIN',
    },
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
5. Add environment variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV=production`. `CORS_ORIGIN` is mandatory in production — the app exits on boot without it.
6. Before first traffic, run `npx prisma migrate deploy` against the Neon DB —
   either as a Render "Pre-Deploy Command" (if your plan supports it) or manually
   once from your machine with `DATABASE_URL`/`DIRECT_URL` pointed at Neon.
7. Hit `GET /health` after deploy to confirm the app can reach Neon.

The app sets `trust proxy` to 1 because Render terminates TLS and forwards the
real client IP in `X-Forwarded-For`; without it the login rate limiter buckets
every user under the proxy's IP and a single user's typos locks out everyone.
This is only safe because Render does not expose the app directly to the
internet — revisit it if the app is ever reachable without the proxy in front.

## What's implemented so far

- DB connection (Prisma + Neon) with a `/health` check
- Swagger UI at `/api-docs` and the OpenAPI document at `/api-docs.json`
- `POST /api/auth/login` — employee code + 4-digit PIN, rate-limited (8 attempts / 15 min). All failures return an identical 401 so the endpoint cannot be used to enumerate valid employee codes.
- `POST /api/admin/employees` — admin-only, creates Employee + User together
- `GET/PATCH /api/admin/employees` — admin-only listing/detail/status update

## Known gaps

- Access tokens are stateless with an 8h lifetime. Deactivating an employee
  blocks the next login but does not invalidate a token that is already issued.
- `UserStatus.DISABLED` has no API path that sets it.
- `xlsx` and `multer` are in `package.json` but unused. `xlsx@0.18.5` has
  unpatched prototype-pollution and ReDoS advisories with no fix published on
  npm, so choose a maintained reader before building the import pipeline on it.
- `bcrypt@5.1.1` pulls `@mapbox/node-pre-gyp` → `tar@6.2.1`, which carries
  critical install-time advisories. `bcrypt@6` or `bcryptjs` avoids the native
  build entirely.

## Not yet implemented (per the original instructions)

Employee's own attendance view, Excel import pipeline, import history/issues.
