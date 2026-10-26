# REKIXO Website Email — Gmail API (Cloudflare Workers)
  
This is a production-only, send-only Gmail API integration for the Cloudflare-native REKIXO company site. It does not alter Google Workspace MX/DNS, LudoPaws, or other products.

## Google Cloud configuration (manual, account owner)
1. Select Google Cloud project `rekixo-website-email` inside the `rekixo.com` organization.
2. Enable Gmail API (`gmail.googleapis.com`). This step is already done.
3. Google Auth Platform > Branding/Audience: choose **Internal** and `ai@rekixo.com` for contact. Only authorized Workspace members will approve the app.
4. Google Auth Platform > Data Access: grant ONLY `https://www.googleapis.com/auth/gmail.send` (sensitive scope, send-only).
5. Create an OAuth 2.0 **Web application** client (NOT a service account key). The OAuth redirect must exactly match the authorization helper's callback URL.
6. Authorize the Workspace mailbox `ai@rekixo.com` with `access_type=offline`, obtain a refresh token via a trusted local authorization code flow, and store it *directly in Cloudflare Secrets*. Never commit, email or paste a token into ChatGPT.
7. Cloudflare Workers & Pages > `rekixo-site` > Settings > Variables and secrets (Production): add three encrypted **Secrets**, spelled exactly:
   - `GMAIL_OAUTH_CLIENT_ID` — Google OAuth client ID
   - `GMAIL_OAUTH_CLIENT_SECRET` — Google OAuth client secret
   - `GMAIL_OAUTH_REFRESH_TOKEN` — send-only authorized offline refresh token
8. Optional variable: `GMAIL_FROM_EMAIL`. Default is `REKIXO_TO_EMAIL` (`ai@rekixo.com`) to match the authorized mailbox. Do **not** set `no-reply@rekixo.com` unless you created and verified it as an approved Gmail send-as alias for the authorized account.
9. Re-run a single real, free internal QA enquiry. Confirm response `emailNotification: "sent"` and actual delivery to `ai@rekixo.com`. Re-send failed saved enquiries by authenticated admin API only after authorization is ready.

## Worker behavior
- All customer enquiries persist to D1, regardless of provider outage.
- Gmail OAuth only activates once all three Production Secrets exist. It refreshes the access token at `https://oauth2.googleapis.com/token` and calls `users.messages.send` using `gmail.send`; no read/delete scope is needed.
- The former Cloudflare Email binding remains as a fallback until Gmail is configured; no DNS changes.
- Failure is recorded as `email_state='failed'` and can be retried with authorized admin credentials.
- Keep OAuth credentials and all bearer tokens exclusively in encrypted Cloudflare Secrets.
- Google Workspace daily sending and API quotas still apply. Gmail API Enabled does **not** mean that OAuth or successful delivery is complete.

## Production credential wiring verification

Production configuration was reported as populated in Cloudflare `rekixo-site` encrypted runtime secrets (`GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN`). No secret values are stored here. Validate by submitting exactly one labeled non-paying QA contact through the opt-in `[verify-lead]` GitHub workflow and inspecting the logged `emailNotification` state. A `sent` API state means Gmail accepted the message; mailbox delivery must still be confirmed separately.
