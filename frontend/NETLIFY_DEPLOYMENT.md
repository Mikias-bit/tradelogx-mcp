# Netlify deployment

The browser requests short-lived signed upload URLs from a Netlify Function,
uploads files directly to the tenant's GCS bucket, and then asks a second
function to submit the GCS object references to TradeLogX.

## Enable customer authentication

Enable Identity for this Netlify project. Under **Identity > Registration >
Registration preferences > Configure**, select **Invite only** and save. This
server setting is mandatory: removing the signup button does not block direct
registration requests while registration remains Open.

After approving a registered TradeLogX customer, use **Identity > Users > Invite
users** with their email address. Netlify sends a personal invitation pointing
to this dashboard. The app handles its invite token and asks the recipient to set
and confirm a password. No public signup form is provided. Do not use an ordinary
shared dashboard URL as an invitation. Customer approval on tradelogx.com is
manual; automatic registration/payment-to-invitation integration is not set up.

Review existing Identity users separately; changing registration preferences
is not a cleanup or revocation of previously created accounts. Keep authorized
accounts and remove unauthorized ones using Netlify's user administration.

Acceptance checks after deployment and the setting change:
- An unauthenticated visitor sees login and invitation guidance, not signup.
- Direct public signup is rejected by Identity.
- An invited customer can set a password and log in; mismatched passwords fail.
- Invalid, expired, or already-used invitation links cannot create an account.
- Login continues to work for approved existing users.

Both upload functions verify the Identity session server-side. No invitation
emails are sent by the frontend; administrators send them through Netlify.

## Required private environment variables

- `TRADELOGX_BACKEND_URL`
- `TRADELOGX_TENANT_ID`
- `TRADELOGX_TENANT_API_KEY` (plaintext, not the Firestore hash)
- `TRADELOGX_GCS_BUCKET` (`tradelogx_store_eu` or `tradelogx_store_us`)
- `GOOGLE_SERVICE_ACCOUNT_JSON` (complete service-account JSON on one line)

Do not prefix secrets with `VITE_`, `REACT_APP_`, or `NEXT_PUBLIC_`. The service
account should be a dedicated upload signer with object-creation access only to
the selected bucket.

## GCS CORS

Create `cors.json`, replacing the example origin with the actual production
site origin:

```json
[{"origin":["https://YOUR-SITE.netlify.app"],"method":["PUT"],"responseHeader":["Content-Type","x-goog-if-generation-match"],"maxAgeSeconds":3600}]
```

Then apply it to the tenant bucket:

```powershell
gcloud storage buckets update gs://tradelogx_store_eu --cors-file=cors.json
```

Use `tradelogx_store_us` for the US tenant. Add the exact custom-domain origin
when applicable; avoid `*` in production.

## Deploy

Push the project to GitHub and connect it to Netlify. If the repository root is
the parent directory, set Netlify's base directory to `frontend` in the Netlify-connected `Mikias-bit/tradelogx-mcp` repository (the local publishing checkout is `tradelogx-mcp-publish/frontend`).
Opening either function URL with GET should return HTTP 405:

```text
/.netlify/functions/create-upload-urls
/.netlify/functions/submit-case
```

Upload a small PDF in the UI and confirm that an object appears under
`uploads/` in the configured bucket and that the returned case ID appears in
the workspace header.

## Case authorization and assistant rollout

Deploy the current gateway, both regional MCP servers, and both workers with this
frontend. The gateway now requires `X-User-ID` from authenticated Netlify Functions
in addition to the private tenant credential. Every case has a server-side owner
binding; older unowned cases are denied. Missing evidence is not a successful check.
Failed cases expose refresh/retry actions. The old background orchestration request
is no longer used: the worker owns processing.

The explanation-only assistant uses `OPENAI_API_KEY`, `OPENAI_MODEL`, and
`ENABLE_ASSISTANT=true` on the regional MCP servers. Do not place the OpenAI key in
Netlify or the browser. See `CUSTOMER_READINESS.md` in the backend checkout for
permissions, backend deployment, secret configuration, data-processing considerations,
and two-account acceptance tests. Chat explicitly reports unavailable until configured.
