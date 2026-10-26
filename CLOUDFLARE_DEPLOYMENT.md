# REKIXO Parent Website — Full Cloudflare-Native Architecture

The company website at https://rekixo.com runs as ONE **Cloudflare Worker with Static Assets** plus **Cloudflare D1** and **Cloudflare Email Service**. The Worker hosts all 19 HTML pages, images/CSS/JS, and the website's own APIs under /api/. The site's old Firebase Hosting config is retained only as a rollback option.

**Razorpay remains the regulated third-party payment gateway** (checkout, collections, bank settlements). Razorpay API calls and their verification logic run server-side on Cloudflare; there is no Firebase API dependency for the company website.

This replaces the earlier Pages-only configuration. **Choose Workers with Static Assets, NOT Pages**.

## Prepared code

- worker/index.js: Cloudflare API, payment capture/signature verification, webhook processing, native Email Service notifications and protected contact viewing.
- public/contact.html: same-origin /api/contact and /api/payment/order, with recovery to retry a paid enquiry without paying twice.
- migrations/0001_initial.sql: D1 tables for orders, contacts, webhooks and abuse-limiting counters.
- wrangler.example.jsonc and scripts/prepare-cloudflare.mjs: generate deployment configuration with actual D1 UUID, keep secrets out of Git.
- public/_headers: browser security headers. Existing Firebase API hostname is removed from the CSP.
- tests/cloudflare-native.test.mjs and .github/workflows/cloudflare-native-checks.yml: payment-security and API regression tests.

## Account-specific setup after code review

1. **D1 database:** Cloudflare Workers & Pages -> D1 -> Create database, name **rekixo-site-production**. Copy its real UUID (not a placeholder).
2. **Generate configuration** in the authenticated build environment (or local checkout). Set **REKIXO_D1_DATABASE_ID** to that real UUID. Optionally set **REKIXO_TO_EMAIL** (default ai@rekixo.com) and **REKIXO_FROM_EMAIL** (default no-reply@rekixo.com). Run: node scripts/prepare-cloudflare.mjs. It creates local ignored wrangler.jsonc (never commit it). The config includes a Worker, public static assets, DB binding, EMAIL binding and daily cleanup cron.
3. **Apply database migration BEFORE public deployment:** npx wrangler@4 d1 migrations apply rekixo-site-production --remote. Confirm tables exist. New enquiries will enter D1, while OLD Firebase records are NOT automatically copied.
4. **Cloudflare Email Service:** onboard/verify the sending domain rekixo.com. Enable outbound email, allow ai@rekixo.com as a destination and verify the sender no-reply@rekixo.com is permitted. Preserve MX/SPF/DKIM/DMARC/mail delivery settings, and check your eligibility/Email Service availability.
5. **Worker secrets** (put via Cloudflare UI or npx wrangler@4 secret put NAME; never commit/paste into chat):
   - RAZORPAY_KEY_ID: matching active Razorpay key ID.
   - RAZORPAY_KEY_SECRET: active Razorpay private API secret.
   - RAZORPAY_WEBHOOK_SECRET: new website-specific secret.
   - RATE_LIMIT_SALT: long random secret to HMAC-hash abuse-limiting IP buckets.
   - ADMIN_TOKEN: randomly generated admin bearer token of 32+ characters.
6. **Deploy Workers with Static Assets:** name rekixo-site, source the private GitHub repository rekixo-lab/rekixo-site. Production branch main after review. Use deployment command **npm run deploy**. Set build-time variable REKIXO_D1_DATABASE_ID in the Cloudflare GitHub Workers Builds environment; this is an identifier, NOT a private secret. Alternatively deploy from an authenticated local terminal. The generated Worker config includes assets directory public and the script worker/index.js.
7. **Payment webhook:** Configure a *dedicated* endpoint in the matching Razorpay account: https://rekixo.com/api/payment/webhook. Enable payment.captured, refund.processed and payment.refunded events with the same dedicated webhook secret. Leave FinWorkar application's other Razorpay webhooks alone.
8. **Domain:** After successful staging tests, connect the Worker custom domain **rekixo.com** in Cloudflare Domains & Routes. Configure www.rekixo.com redirect to apex separately if needed. Do not touch finworkar.rekixo.com, ar3dstudio.in, mail DNS, other Workers or product APIs. Keep old Firebase Hosting available for rollback.

## API endpoints

| Method and URL | Native Cloudflare behavior |
| --- | --- |
| GET /api/health | D1 health and binding presence |
| POST /api/payment/order | Server-owned INR 1,000 (100000 paise) order created with Razorpay; matching D1 row |
| POST /api/contact | Save free enquiry; for paid bookings check signature, captured payment, amount, currency, order and person; send email through Cloudflare |
| POST /api/payment/webhook | Raw-body HMAC verification, deduplicated webhook events and payment/refund records |
| GET /api/admin/contacts | List enquiries; requires Authorization Bearer ADMIN_TOKEN |
| POST /api/admin/contacts/{id}/resend | Authorized failed-notification retry |

Admin APIs expose personal details. Keep ADMIN_TOKEN server-side; never place it in frontend code, URL parameters, screenshots or GitHub.

## Verification before a domain cutover

- GitHub CI: **npm run validate** (checks static assets and API/payment signatures).
- Check homepage, product pages, AR3D portfolio, static assets, favicon, dark mode, robots/sitemap, legal pages and 404.
- GET /api/health must return database ready. An email binding being present does **not** prove verified sender or delivered mail.
- Send a non-paid test form. Confirm D1 contact and receipt in ai@rekixo.com. Check email_state = sent in D1; failed notifications remain stored and can be retried by an authorized operator.
- Use **Razorpay test credentials and isolated staging D1** for test-mode payments; don't spend real INR 1,000 merely to test the site.
- Validate signature rejection, Razorpay captured payment, fixed amount, webhook event idempotency, replay-resistant booking and paid-form retry without a second charge.
- Note the active legacy/new Razorpay accounts must use the *matching* key ID and private secret. Never assume Firebase payment keys are automatically imported.
- No live payments should be mid-flight during the cutover: OLD pending payment orders in Firebase are not in NEW D1 and require explicit reconciliation.

## Guarantees and limits

- The browser never receives the Razorpay private API secret; captured state and signature are verified server-side.
- Paid bookings use deterministic ID tied to the Razorpay order and cannot create a second paid enquiry via replay.
- If sending an email fails, the contact is still stored in Cloudflare D1 with email_state failed. Check D1/admin results and retry.
- A daily Worker cron removes expired API rate-limit entries **only**, not payment or contact records.
- Storing user details in D1 means REKIXO must apply an appropriate privacy/retention policy and backup strategy.
- Cloudflare Workers, D1, Email Service and Razorpay have independent quotas, pricing and onboarding requirements.

## Rollback

Keep Firebase Hosting and existing Firebase Functions untouched for your other REKIXO products. Record original apex DNS/Worker route before switching; restore that setup if needed. Reconcile any D1 payments/contacts and old Firebase pending payments before or during rollback. Avoid mid-payment DNS switching.

## What is not completed by a GitHub commit

Cloudflare account actions (D1 creation, Email Service verification, secrets, Worker build authorization, custom domain), Razorpay webhook setup and real end-to-end testing require authenticated Cloudflare/Razorpay access. The repository alone cannot perform or prove those actions. Do **not** claim the new production site is live until actual deployment and checks confirm it.
