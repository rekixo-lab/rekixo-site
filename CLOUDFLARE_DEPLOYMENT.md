# REKIXO Parent Site — Cloudflare Pages Deployment

This repository is the **parent website** for `rekixo.com` (not the AR3D, FinWorkar or LudoPaws apps). It is a **static HTML/CSS/JavaScript** site. It does **not** need a Cloudflare Worker, Next.js, a package installation step, a database migration or a build artifact generator.

## Verified structure

- Production files: `public/`, including `index.html`, `404.html`, 19 HTML pages, CSS/JS and image assets.
- Existing Firebase Hosting settings: `firebase.json` and `.firebaserc`. Retained for rollback; do not remove until cutover is verified.
- Cloudflare Pages static response security rules: `public/_headers`.
- Automated link/sitemap/security validation: `scripts/validate-pages.mjs`.
- The contact form and INR 1,000 advance booking intentionally call **existing Firebase Cloud Functions** from the browser. The Razorpay Checkout script also remains external. Do not move payment secrets into this frontend.

## Create the Pages project (Cloudflare dashboard)

1. **Workers & Pages → Create application → Pages → Connect to Git / Import a Git repository.**
2. Authorize the Cloudflare GitHub integration for the **private** repository `rekixo-lab/rekixo-site` (prefer access limited to this repository).
3. Use these **exact** settings:

   | Setting | Value |
   |---|---|
   | Project name | `rekixo-site` (or another unique name) |
   | Framework preset | `None` |
   | Production branch | `main` |
   | Root directory | repository root (leave blank or `/`) |
   | Build command | `node scripts/validate-pages.mjs` |
   | Build output directory | `public` |
   | Environment variables | none for the static website |

4. Deploy. Cloudflare will publish a temporary `<project>.pages.dev` URL and automatically deploy future commits to `main`. Pull requests may receive preview URLs.

If the build system does not provide Node, the site itself does not require any build: use `exit 0` (or no build command), output directory `public`, and run the validator separately.

## Safe domain cutover

1. **Do not change production DNS yet.** On the Pages preview, inspect visual layout, light/dark theme, navigation, static assets, mobile behavior, and 404 handling.
2. The current Cloudflare account already displays a `rekixo.com` zone. In the Pages project choose **Custom domains → Set up a domain → `rekixo.com`**. Let Cloudflare create or reconcile the necessary DNS record; review existing records before approval.
3. Check that only the intended apex hostname is migrated. **Do not modify** `finworkar.rekixo.com`, `ar3dstudio.in`, Workers, mail MX/TXT/SPF/DKIM/DMARC, or other service records.
4. Verify `https://rekixo.com/`, legal pages, `/contact`, `/rekixo-ar3d`, `/sitemap.xml`, CSS/images and custom 404. Cloudflare Pages automatically redirects `/contact.html` to `/contact` and serves `404.html` for unknown routes. Existing `.html` links generally still work via redirects, but a follow-up SEO pass should align canonical/sitemap URLs with the extensionless URLs.
5. Check `www.rekixo.com` separately and configure an apex redirect using a **Cloudflare Redirect Rule** if required. Pages `_redirects` is **not** the mechanism for host-level redirects.
6. Only after production verification, retire the old Firebase Hosting destination (do not delete the Firebase project or the Cloud Functions).

## Contact form, payments and CORS

The browser makes POST requests to:

- `https://asia-south1-fin-workar.cloudfunctions.net/api/submit-rekixo-contact`
- `https://asia-south1-fin-workar.cloudfunctions.net/api/create-website-advance-order`

Those endpoints continue running on Firebase. The backend code currently allows `https://rekixo.com` and `https://www.rekixo.com` as CORS origins. **The temporary `*.pages.dev` preview is not allowlisted by default**; a failed preview-domain form request does not by itself mean the production apex will fail. If end-to-end preview testing is essential, add only the exact Pages preview origin to `FINWORKAR_CORS_ORIGINS` via the backend's own deployment process and remove it after testing.

Test ordinary contact submission on the final custom domain and confirm the admin email arrived. **Never perform a real ₹1,000 payment just to smoke-test hosting**; use a separate payment test plan / Razorpay test-mode environment before authorizing live payment testing. Preserve existing server-side order, signature, amount and captured-payment verification.

## Security and rollback

- `public/_headers` replicates the existing Firebase Hosting CSP, HSTS, nosniff, referrer, permissions and clickjacking headers. It intentionally permits Razorpay Checkout and the Firebase endpoint; test headers on Cloudflare's actual responses.
- Do not commit Cloudflare API tokens, Cloudflare account IDs, Firebase service accounts or Razorpay secrets. None are needed to serve this static site.
- A GitHub push alone does **not** connect the Cloudflare account; the Pages project, GitHub installation authorization and custom-domain attachment require dashboard access.
- **Rollback:** if the cutover causes issues, restore the previously recorded DNS/hosting setup and verify contact submissions. Keep Firebase hosting deployed until Cloudflare is stable.

## Local verification

```bash
node scripts/validate-pages.mjs
```

The script checks required files, local references in HTML, sitemap targets and the deployment-critical security header rules. It is not a substitute for browser or payment integration testing.
