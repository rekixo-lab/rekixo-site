# REKIXO company site

This is the REKIXO parent-company website, deployed as a Cloudflare Worker with static assets. It is **not** the release source for FinWorkar, AR3D, GeoLive, LudoPaws or EntroNex.

## Responsibilities
- `public/`: canonical company pages, product descriptions, contact UI and policies.
- `worker/`: company website contact and optional historical payment verification APIs.
- `migrations/`: website D1 data migrations.
- `scripts/` and `tests/`: local validation and browser regression testing.

The owner has requested a production-only delivery workflow; no staging service is required to run the local static browser tests. A Pull Request must be validated and reviewed before the connected main-branch deployment. **Do not merge a site PR before verifying product status claims against the correct product repository.**

## Local quality checks
Run `npm run validate` for source checks, `npm run test:ui` for Playwright Chromium checks when installed, and inspect Cloudflare production smoke results after any merge.

Browser QA must never submit contact forms, invoke Razorpay, contact production APIs, or use real customer information.

## Safe release checklist
1. Validate Product Status source + dated evidence (see `docs/REKIXO_PRODUCT_GOVERNANCE.md`).
2. Confirm all public/legal/product links and mobile, tablet, desktop, light/dark layouts.
3. Confirm company website policies agree with the current contact/payment implementation.
4. Check privacy language with qualified counsel; do not invent registration, address verification, certificates, clients or revenue.
5. Deploy via existing Cloudflare Worker connection and compare the released asset version with the PR merge SHA.
6. Keep payments, D1, Gmail, and per-product runtimes isolated.

## Dependency note
The proposed FinWorkar change removing mandatory feedback spans the backend, Android app and consumer website. **Backend deletion acceptance must pass first**, followed by verified Android rollout; only then describe the new deletion experience as generally available. Similarly, LudoPaws public-launch claims require verified Google Play approval, not a passing GitHub build.
