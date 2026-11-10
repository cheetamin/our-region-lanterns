# Free Worker recovery implementation plan

Goal: prevent Error 1102 on page navigation without changing existing classroom data, credentials, quotas or original Jinju deployment.
Architecture: build the existing client components as static Vite assets; use the existing authenticated API directly in a small Worker, without the RSC/SSR runtime. Keep the existing build command and deployment output config path.

- [x] Add routing tests proving page GETs use assets, API requests reach the existing handler, API failures never become HTML, and unsupported methods fail closed.
- [x] Add a browser-only entry selecting the existing Gallery, Teacher, Studio and Admin components; preserve query strings and RegionProvider.
- [x] Build static client plus bundled API Worker; configure asset-first serving with API-first routes; preserve D1 and secrets by Worker name.
- [x] Run complete existing suite, type checks, production build and local browser/API smoke checks.
- [ ] Commit, deploy through existing GitHub main pipeline; verify public pages repeatedly plus authenticated admin and existing test classroom flows.

Review focus: private API data must never be cached; class query/context must remain unchanged; deep-link reloads must work; route failures must not submit data twice; original Jinju database stays untouched.
