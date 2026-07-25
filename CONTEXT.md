# Tallyo repository context

This is a personal-finance inspection application. A single user imports or
creates transactions, maps transaction descriptions to merchants and categories,
reviews them, and explores spending/income through reports and dashboard charts.

## Repository map

```
apps/web       React single-page application
apps/server    Hono API, oRPC procedures, PostgreSQL/Drizzle data layer
compose.yml    Local PostgreSQL and production-style server container
ops/           Operational backup-related material
```

The repository is an npm-workspaces Turborepo. Node/npm are used throughout;
the declared package manager is npm 10.8.2. Biome is the formatter/linter.

## Technology and request flow

```
React 19 + Vite + TanStack Router/Query
  -> browser oRPC client (/rpc, cookie credentials)
  -> Hono + oRPC handlers
  -> Drizzle ORM
  -> PostgreSQL 16
```

The web app imports the server router type directly, so changing an oRPC
contract usually affects both applications at compile time.

`apps/server/src/index.ts` is the server composition root. It exposes:

- `/api/auth/*` — custom authentication endpoints;
- `/api/*` — bearer-token external REST API (including transaction import);
- `/rpc/*` — authenticated internal oRPC API used by the web app;
- `/` — health check in development, or the built SPA in production.

In development the web app runs at `http://localhost:3001` and the API at
`http://localhost:3000`. The web oRPC client deliberately uses the current
origin (`/rpc`), making the Vite proxy configuration relevant for local work.

## Domain model and invariants

The primary schema is in `apps/server/src/db/schema/app.ts` (auth tables are
separate in `schema/auth.ts`). All main records are scoped by `userId`.

- `settings`: one row per user; developer mode, privacy mode, and webhook URLs.
- `categories`: optionally hierarchical via `parentCategoryId`; categories can
  be income categories or excluded from insights.
- `merchants`: normalized vendors with an optional recommended category.
- `merchant_keywords`: user-owned keyword-to-merchant matching rules.
- `transactions`: amount, date, details, notes, relations, review status, and
  optional `splitFromId`; `(externalId, userId)` is unique for idempotent
  imports.
- `auth_token`: one generated bearer token per user for the external API.

Amounts are integer cents. Positive values represent income and negative values
represent expenses. UI forms convert dollars to cents before calling the API.

Merchant keyword matching and category recommendation are handled in
`apps/server/src/routers/merchants.ts` and shared matching helpers. Transaction
creation/import should preserve those rules. A split transaction's child amounts
must exactly sum to its original transaction amount.

## Application surfaces

File-based page routes live in `apps/web/src/routes/`:

- `/` landing page; signed-in users are redirected to `/dashboard`.
- `/dashboard` charts, period insights, merchant/category/transaction stats,
  and Sankey visualization.
- `/transactions` table, search/filtering, manual creation, reporting, review,
  notes, and splitting.
- `/categories` and `/merchants` manage the normalization taxonomy.
- `/reports`, `/settings`, `/privacy`, and `/terms` complete the main UI.
- `/_auth/signin` contains the sign-in route.

Reusable product components are grouped by feature under
`apps/web/src/components/`; generic shadcn-style primitives are under `ui/`.
The root route owns auth-aware layout, theme selection, toasts, keyboard
shortcuts, and development tools.

## Server contracts

`apps/server/src/routers/index.ts` combines the internal oRPC API:

- `auth`: user existence, session, sign-out, Discord OAuth URL.
- `categories`: list/create/update/delete.
- `merchants`: list/create/update/delete, apply matching, bulk application, and
  merging.
- `transactions`: create/list/update category or merchant/toggle review/update
  notes/delete/split/report.
- `dashboard`: aggregate category, merchant, transaction, Sankey, and count
  data.
- `settings`: user preferences and external API token lifecycle.
- `meta`: webhook refresh and account metadata.

The external REST API is implemented in `apps/server/src/external-api.ts`; its
human-facing reference is `apps/server/src/external-api-docs.md`. It authenticates
with `Authorization: Bearer <token>` and supports bulk transaction insertion,
listing, and related resource operations. Imports are limited to 100
transactions per request and ignore duplicate external IDs.

## Authentication and configuration

Authentication is custom Discord OAuth/session code, despite older
`BETTER_AUTH_*` variable names and README wording. The server validates these at
module load:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `CORS_ORIGIN`

`DISCORD_REDIRECT_URI` is optional and otherwise derives from `CORS_ORIGIN`.
`DATABASE_URL` is needed by Drizzle. `apps/server/.env.example` includes the
database/CORS defaults but currently omits the two required Discord variables;
add them to a real local `.env` before starting the server.

Sessions last 30 days and are stored in PostgreSQL. The app's current model is
effectively single-user: after the first registration, only the originally
linked Discord account can sign in.

## Development workflow

```bash
npm install
npm run db:dev                 # starts local PostgreSQL (port 5432)
cp apps/server/.env.example apps/server/.env
# add Discord credentials to apps/server/.env
npm run db:push                # apply schema to the database
npm run dev                    # web :3001 and server :3000
```

Useful commands:

- `npm run check-types` — TypeScript checks across the apps.
- `npm run check` — Biome check with `--write` (it can modify files).
- `npm run build` — builds both web and server.
- `npm run db:generate` / `npm run db:migrate` — create/apply Drizzle migrations.
- `npm run db:seed` — seed starter data for the first user.
- `npm run db:down` — stop the compose database.

There is no dedicated automated test suite configured in the package scripts at
the time this document was written. Use type checking and focused manual/API
verification when changing behavior.

## Change guide

- Start API work in the relevant router, then follow the inferred type into the
  corresponding web component or route.
- Keep user ownership checks and transaction amount-in-cents semantics intact.
- Make schema changes in `db/schema/`, then generate a migration and update the
  data-access code; do not edit existing migrations retroactively.
- For production bundling, the server `build:full` script builds the web app and
  copies its assets to `apps/server/public`; the standard root build builds both
  workspaces but does not perform that copy.
- Preserve unrelated uncommitted changes. This repository may include local
  database data in `postgres-data/`; treat it as environment state, not source.
