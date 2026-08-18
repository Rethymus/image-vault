# Agent reproduction checklist

This document is the shortest complete route for an agent or developer who wants to reproduce the working deployment.

## Inputs required from the owner

The owner must provide or configure these values in their own environment:

- Cloudflare account authentication for Wrangler;
- an R2 bucket name;
- the R2 public origin (`r2.dev` or a custom domain);
- the admin Worker name and hostname;
- the public upload Worker name and hostname;
- the Access team domain;
- the Access application audience tag;
- the owner email allowlist;
- optional GitHub Actions secrets for automated deployment.

Do not put these inputs in this document or in the public repository.

## Reproduction sequence

### 1. Install and authenticate

```powershell
npm install
npx wrangler login
```

### 2. Create R2

```powershell
npx wrangler r2 bucket create <bucket-name>
npx wrangler r2 bucket dev-url enable <bucket-name>
```

If a custom R2 domain is used, enable it and use that origin instead of an `r2.dev` URL.

### 3. Configure the two Wrangler files

Update `worker/wrangler.admin.jsonc` and `worker/wrangler.upload.jsonc`:

- use the same `bucket_name` in both files;
- set `ADMIN_HOST` to the admin Worker hostname;
- set `UPLOAD_ORIGIN` to the public upload Worker URL;
- set `PUBLIC_IMAGE_ORIGIN` to the R2 origin;
- keep `MAX_IMAGE_BYTES` at 8388608 unless the product policy changes.

### 4. Deploy the upload Worker

```powershell
npm run worker:upload:dry-run
npm run worker:upload:deploy
```

The root of the public Worker should return 404. That is expected.

### 5. Configure and deploy admin Worker

```powershell
npx wrangler secret put ACCESS_TEAM_DOMAIN --config worker/wrangler.admin.jsonc
npx wrangler secret put ACCESS_AUD --config worker/wrangler.admin.jsonc
npx wrangler secret put OWNER_EMAILS --config worker/wrangler.admin.jsonc
npm run worker:dry-run
npm run worker:deploy
```

### 6. Configure Access

Create a Self-hosted Access application for the admin Worker destination only. Add an Allow policy for the owner email. Do not protect the upload Worker.

### 7. Verify the flow

```text
admin login
  → open Phone upload
  → confirm QR canvas and countdown
  → open /s/<token> from a browser without Access
  → select one or more images
  → upload
  → confirm admin list refreshes
  → stop and close
  → confirm /s/<token> returns 410
  → confirm the image URL behavior matches the chosen bearer-link model
```

## Deployment acceptance criteria

- admin page is not usable anonymously;
- `POST /api/upload-sessions` cannot be used anonymously;
- public Worker root and admin-like endpoints return 404;
- a valid session page works without login;
- unsupported types and oversized files are rejected;
- a session expires after ten minutes or closes immediately when revoked;
- at most five uploads are accepted per session;
- admin list refreshes after phone upload;
- no secrets are present in built JavaScript or committed files.

## GitHub Actions acceptance criteria

After manual deployment succeeds, configure:

```text
CLOUDFLARE_API_TOKEN  repository secret
CLOUDFLARE_ACCOUNT_ID repository secret
PUBLIC_IMAGE_ORIGIN   repository variable
```

Push a documentation-only change first if you want to confirm the workflow wiring without deploying a new image. Then use a code change to verify both Workers deploy in the intended order.
