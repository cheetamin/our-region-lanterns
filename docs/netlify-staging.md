# Netlify staging deployment (not a production cutover)

This is an optional second frontend hostname for the public regional lantern site.
The existing Cloudflare Worker and D1 database remain the authoritative backend.
Do **not** delete, replace, migrate, or reinitialize the classroom database.

## Import from GitHub

1. Open Netlify **Add new project > Import an existing project > GitHub**.
2. Authorize access to the GitHub account **cheetamin** and select
   **cheetamin/our-region-lanterns**.
3. Select the Netlify staging branch after this configuration has been reviewed.
   (Do not deploy a Next.js SSR build: this repository's Netlify output is the
   existing Vite static client under dist/client.)
4. Verify the build settings loaded from netlify.toml:
   - Build command: pnpm exec vite build --config vite.static.config.ts
   - Publish directory: dist/client
   - Node version: 24
5. Deploy only as a staging site. Never replace the existing Cloudflare DNS or
   Worker route for the working classroom site.

## API flow and safety

Netlify Edge Function /api/* proxies to the existing Cloudflare Worker.
The browser's Origin is checked before the proxy sets the backend origin.
Cookies and request bodies must be forwarded, and every API response is marked
Cache-Control: no-store.

This does NOT relocate the API or database to Netlify. Do not point the
frontend directly at a different D1 database or change student credentials.

## Tests and manual verification before rollout

- Unit test: node --test tests/netlify-api-proxy.test.mjs
- Build: pnpm exec vite build --config vite.static.config.ts
- Netlify deployment logs must show a successful build and edge function.
- On the **staging** hostname, test GET /api/status, create a throwaway class
  using nonstudent data, log in, save a draft, upload a sample image, reload,
  and log out. Confirm that the cookie remains on the Netlify host.
- Confirm that cross-origin POSTs fail with 403.
- Run a classroom-sized load test before using the staging hostname for real
  students. Netlify proxying may change the IP address used for backend rate
  limiting, so the old 30-user test on Cloudflare does not validate this path.
- Do not make any DNS or production URL changes before these tests pass.

## Rollback

The original Cloudflare hostname continues to serve the full app. If Netlify
staging fails, stop using or unpublish the staging site; there is no database
migration to reverse. This draft intentionally does not alter main.
