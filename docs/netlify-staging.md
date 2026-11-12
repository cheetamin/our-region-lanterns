# Netlify staging (isolated from production)

Frontend: https://our-region-lanterns-staging.netlify.app
Branch: codex/netlify-staging-20261112 (PR #1; do not merge into main).

## Build

- Build command: `pnpm exec vite build --config vite.static.config.ts`
- Publish directory: `dist/client`
- Node: 24; pnpm: 11.25.0
- `NETLIFY_NEXT_PLUGIN_SKIP=true` prevents Next.js auto-detection from inspecting the Vite output.

## Storage isolation

The Edge Function forwards `/api/*` only to
`https://our-region-netlify-staging.cheetamin.workers.dev`.
That dedicated Worker binds `DB` to `our-region-netlify-staging-db`
(`46f47d93-dfa5-4ce8-b5ba-33fc98623ed8`) and uses `FILE_STORAGE=d1`.
It contains synthetic test data only. No production student data or credentials
were copied. Do not change the target to the production Worker for testing.

The existing `our-region-lanterns` Worker, database, DNS, routes and main branch
are not part of this staging deployment.

## Backend updates

`wrangler.netlify-staging.jsonc` is the dedicated API-only configuration.
Deploy only this configuration for staging. It does not replace the production
`wrangler.external.jsonc` file. The initial API bundle was built from the staging
branch using `scripts/build-external.mjs` and deployed to the dedicated Worker
through the dashboard. All seven SQL migrations were applied to the empty
staging DB through its dashboard console.

For future migrations and API deployments use the explicit staging config:

```
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.netlify-staging.jsonc
pnpm exec wrangler deploy --config wrangler.netlify-staging.jsonc
```

Verify the database ID and Worker name before either command. Never run these
commands against the production config as part of testing.

## Verification

- `node --test tests/netlify-api-proxy.test.mjs`
- Static Vite build
- Actual Netlify hostname: class creation; teacher and student sign-in; draft
  save/reload; sample PNG upload and authenticated download; logout.
- Cookies must remain scoped to the Netlify hostname.
- Foreign-Origin POST requests and requests missing X-Lantern-Request fail 403.

Classroom-wide concurrency testing is a separate rollout check: proxying can
change the IP seen by backend rate limits. Do not assume the old Cloudflare
load tests cover this path.

## Rollback

Stop using or unpublish this Netlify staging project. Production remains on its
existing Cloudflare hostname. No production database migration is required.
