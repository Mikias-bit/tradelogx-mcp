# Netlify deployment

The browser requests short-lived signed upload URLs from a Netlify Function,
uploads files directly to the tenant's GCS bucket, and then asks a second
function to submit the GCS object references to TradeLogX.

## Enable customer authentication

After the first deploy, open the Netlify project, go to **Identity**, and select
**Enable Identity**. Under **Identity > Registration**, choose **Open** to allow
the signup page to create accounts, or **Invite only** if every customer must be
approved first. Email confirmation is enabled by default. Both upload functions
verify the Netlify Identity session server-side; the dashboard UI alone is not
the security boundary.

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
[{"origin":["https://YOUR-SITE.netlify.app"],"method":["PUT"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
```

Then apply it to the tenant bucket:

```powershell
gcloud storage buckets update gs://tradelogx_store_eu --cors-file=cors.json
```

Use `tradelogx_store_us` for the US tenant. Add the exact custom-domain origin
when applicable; avoid `*` in production.

## Deploy

Push the project to GitHub and connect it to Netlify. If the repository root is
the parent directory, set Netlify's base directory to `netlify-frontend`.
Opening either function URL with GET should return HTTP 405:

```text
/.netlify/functions/create-upload-urls
/.netlify/functions/submit-case
```

Upload a small PDF in the UI and confirm that an object appears under
`uploads/` in the configured bucket and that the returned case ID appears in
the workspace header.
