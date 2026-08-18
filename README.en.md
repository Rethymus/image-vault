# Image Vault: Complete Cloudflare Workstation Guide

This repository contains a small owner-only image manager for personal portfolios, README assets, project screenshots, and occasional phone uploads.

The security model is intentionally explicit:

> The manager is private, images are public-by-link, image URLs are difficult to enumerate, and phone uploads are granted through a short-lived QR channel.

The stack is:

- Cloudflare Workers for the admin and public upload edges;
- Cloudflare R2 for objects and temporary upload sessions;
- Cloudflare Access for owner-only management access;
- GitHub Actions and Wrangler for deployment;
- React + Vite for the admin UI;
- `qrcode` for browser-side QR rendering.

## GitHub Pages showcase (demo only)

The public repository includes a separate [GitHub Pages showcase](https://rethymus.github.io/image-vault/). It does not connect to Cloudflare. Instead, it builds with `VITE_API_MODE=demo` and presents the workstation, all six concept images, light/dark/system appearance, bilingual UI, and the QR phone-upload flow entirely in the browser.

The showcase supports file selection or drag-and-drop, simulated upload progress, QR generation, a mobile upload page, and a completed local upload state. It has no persistence: files are not sent to R2, a Worker, GitHub, or a database, and they are not transferred back from the phone to the desktop across devices. Refreshing or closing the page clears the demo state. Do not upload a real identity document, original ID photo, unreleased résumé, or other sensitive file to this public page.

See [`docs/github-pages-demo.md`](docs/github-pages-demo.md) for the asset map and deployment boundary. On first setup, choose `GitHub Actions` under `Settings → Pages`.

## 0. Agent reproduction entrypoint

If the goal is a one-to-one reproduction, do not hand an agent only one source file. Ask it to read these repository entrypoints first:

1. [`AGENTS.md`](AGENTS.md) for safety boundaries, stop conditions, and required checks;
2. [`AGENT_PROMPT.md`](AGENT_PROMPT.md) for a copyable startup prompt;
3. this file and [`README.zh-CN.md`](README.zh-CN.md) for the complete bilingual rationale;
4. [`docs/agent-reproduction.md`](docs/agent-reproduction.md) for the phased runbook, owner-input list, acceptance matrix, and Actions behavior.

The default agent order is:

```text
read-only inspection → identify YOUR_* → local dry-runs → typecheck/build → owner approval → cloud mutation → online acceptance
```

The agent must not guess production hosts, bucket names, Access audiences, or owner emails, and must never ask the user to paste secrets into chat or source files.

## Workstation screenshots and supporting upload states

The full desktop workstation is the primary product surface. The QR sheet and phone page are supporting branches of that workstation, not the whole product. The repository includes Chinese/English and light/dark states.

![English full workstation](docs/assets/screenshots/en/admin-assets.png)

![English dark workstation](docs/assets/screenshots/en/admin-dark.png)

![English QR sheet](docs/assets/screenshots/en/qr-phone-upload.png)

![English mobile light upload complete](docs/assets/screenshots/en/phone-upload-success.png)

![English mobile dark upload complete](docs/assets/screenshots/en/phone-upload-dark.png)

All four mobile screenshots use the same `390 × 844` canvas. The dark state is rendered through the phone's system color-scheme preference.

The QR screenshots are documentation-only demos. Never commit a production QR token, Access credential, or personal file to a public repository.

## 1. Why the original GitHub Pages idea was attractive

The first design was deliberately GitHub-centric:

1. store images in a private GitHub repository;
2. publish image files or a static site through GitHub Pages;
3. use unpredictable file names as public image URLs;
4. upload by committing files to the repository;
5. embed the resulting URLs in Markdown, HTML, or a portfolio.

That model is useful when:

- Git history is the source of truth;
- images are part of a versioned documentation project;
- updates are rare;
- a static build is enough;
- no runtime upload or management UI is needed.

However, an important boundary must not be missed:

> A private GitHub source repository does not make the published GitHub Pages site private.

GitHub Pages is a static publishing layer. It does not give the page a normal server-side session, database authorization, or private upload endpoint. A front-end password check is only a visual lock, and a GitHub PAT or Cloudflare secret in browser JavaScript is exposed to every visitor.

## 2. Why this implementation moved to Workers + R2

The practical requirements became:

- occasional uploads of a few images;
- no manual GitHub web upload each time;
- no custom domain required;
- owner-only management;
- QR upload from a phone without sign-in;
- direct image URLs that can be embedded in Markdown/HTML;
- as little infrastructure as possible.

The final design therefore uses two Workers:

```text
vault-admin
  ├── Cloudflare Access, owner only
  ├── React administration UI
  ├── create/revoke temporary upload sessions
  ├── list/delete/rotate image links
  └── R2 binding for object operations

vault-upload
  ├── public so a phone can open it
  ├── accepts only /s/<43-character random token>
  ├── ten-minute expiry
  ├── at most five images per session
  └── has no listing, delete, or admin endpoints
```

R2 stores the session root at `sessions/<token>`, upload markers below that prefix, and assets at `i/<asset-token>`. The public Worker only knows the temporary token. It cannot list the vault or delete assets.

## 3. Trade-offs

### Original GitHub Pages approach

Advantages:

- simple and Git-native;
- every change can be reviewed as a commit;
- a good fit for versioned project documentation;
- no separate object-storage service;
- GitHub Actions gives a visible build history.

Disadvantages:

- published Pages content should not be treated as private;
- uploads are commits followed by a build/deploy delay;
- there is no natural runtime upload endpoint;
- deletion and URL rotation are not as immediate;
- a published admin page needs an additional access boundary;
- the repository lifecycle becomes coupled to the asset lifecycle.

### Current Workers + R2 approach

Advantages:

- upload directly from the browser;
- upload from a phone through a temporary QR session;
- Access and Worker-side JWT validation protect management operations;
- R2 objects do not require a full site rebuild for every upload;
- real-time list, delete, and URL rotation operations;
- no custom domain required for a personal deployment;
- 256-bit random tokens make URL enumeration impractical.

Disadvantages:

- an exact image URL is still a bearer capability;
- the `r2.dev` variant is best suited to personal or hobby use;
- Access, R2, Worker secrets, and Actions secrets must be configured;
- the public upload Worker must remain outside the Access boundary;
- QR expiry does not delete images that have already been uploaded;
- this is a single-owner tool, not a team asset platform.

## 4. Who should use which design?

Use this repository when you are an individual developer or small portfolio owner who uploads a few images occasionally, wants a browser upload flow, does not want to buy a domain, and accepts that anyone holding a complete image URL can view that image.

Use the original GitHub Pages approach when images are versioned project artifacts, updates are rare, every change should be reviewed in Git, and public Pages content is acceptable.

Use neither approach for passports, identity documents, contracts, medical records, financial files, or any content that must support per-user authorization or reliable revocation. Use private R2 objects with short-lived signed URLs, an authenticated download Worker, or a dedicated file-management product instead.

## 5. Reproduce the deployment

### 5.1 Prerequisites

- GitHub account;
- Cloudflare account with R2 enabled;
- Node.js 20 or newer;
- Wrangler;
- an account-scoped Cloudflare API token if GitHub Actions will deploy.

Authenticate Wrangler and install dependencies:

```powershell
npx wrangler login
npm install
```

### 5.2 Create the R2 bucket

```powershell
npx wrangler r2 bucket create private-image-vault
npx wrangler r2 bucket dev-url enable private-image-vault
```

The `r2.dev` URL is convenient for a no-domain personal deployment. For a more production-oriented setup, connect an R2 custom domain, disable `r2.dev`, and replace `PUBLIC_IMAGE_ORIGIN` with that domain.

### 5.3 Replace placeholders

The public configuration intentionally contains placeholders instead of the original production names. Update:

- `worker/wrangler.admin.jsonc`;
- `worker/wrangler.upload.jsonc`;
- `worker/wrangler.bootstrap.jsonc`;
- `.env.example` or the environment used by the build.

Replace at least:

```text
YOUR_ADMIN_WORKER.workers.dev
YOUR_UPLOAD_WORKER.workers.dev
YOUR_BUCKET_ID.r2.dev
```

Both Workers must bind the same R2 bucket.

### 5.4 Deploy the public phone upload Worker

Deploy the public edge first, because the admin Worker uses its URL when generating a QR session:

```powershell
npm run worker:upload:deploy
```

The public Worker root intentionally returns 404. Only an exact `/s/<session-token>` URL shows an upload page.

### 5.5 Configure admin Worker secrets

```powershell
npx wrangler secret put ACCESS_TEAM_DOMAIN --config worker/wrangler.admin.jsonc
npx wrangler secret put ACCESS_AUD --config worker/wrangler.admin.jsonc
npx wrangler secret put OWNER_EMAILS --config worker/wrangler.admin.jsonc
```

Never commit these values, a PAT, a Cloudflare API token, an Access JWT, or a live QR token.

### 5.6 Deploy the admin Worker

```powershell
npm run worker:deploy
```

The admin Worker serves the Vite build and handles `/api/*`. The production build must use:

```text
VITE_API_MODE=worker
VITE_PUBLIC_IMAGE_ORIGIN=https://YOUR_BUCKET_ID.r2.dev
```

### 5.7 Configure Cloudflare Access

In Cloudflare One / Zero Trust Access:

1. create a Self-hosted application;
2. choose the Worker destination;
3. select the admin Worker production URL;
4. add an Allow policy;
5. include the owner email;
6. do not put the public phone upload Worker behind this application;
7. verify that an anonymous browser is redirected or denied while the owner can load the admin UI and APIs.

With no custom domain, do not assume you need a Domains & Routes entry first. The Access application can target the `workers.dev` Worker directly.

### 5.8 Validate locally and online

```powershell
npm run worker:typecheck
npm run build
npm run worker:dry-run
npm run worker:upload:dry-run
```

Then run the real flow: generate a QR code, open its tokenized page without authentication, upload one image, wait for the admin list to update, stop the session, and confirm that the old URL returns 410.

## 6. GitHub Actions: validation and optional deployment

The earlier runs in both repositories failed at the Wrangler deployment step because the GitHub runner is non-interactive and no `CLOUDFLARE_API_TOKEN` was configured. The UI build was not the problem. The workflow is now intentionally split into two jobs:

1. `Validate Vault` runs on pushes to `main` and on manual runs. It installs dependencies, generates Worker types, typechecks, builds the admin UI, and runs both Wrangler dry-runs. It needs no Cloudflare API token.
2. `Deploy both Workers (optional)` runs only after a manual workflow dispatch with `deploy=true`. It checks for the deployment secrets first; if they are absent, it records a notice and leaves validation green rather than pretending that a deployment happened.

Configure these only in repository settings:

```text
Secrets:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID

Variables:
  PUBLIC_IMAGE_ORIGIN
```

Use an account-scoped API token with the least permissions required by the deployment. Do not use the Cloudflare Global API Key. Perform the first deployment locally, verify bindings, Access, and the R2 origin, then run Actions manually with `deploy=true`. Forks of the public repository can run the validation job without having your Cloudflare credentials.

## 7. Temporary QR flow

The admin UI calls:

```text
POST /api/upload-sessions
```

The admin Worker creates a random session token with Web Crypto and stores:

```text
sessions/<43-character-token>
```

It returns a URL shaped like:

```text
https://YOUR_UPLOAD_WORKER.workers.dev/s/<token>
```

The phone can then call only:

```text
POST /api/upload/<token>
```

The uploaded object is stored as:

```text
i/<43-character-asset-token>
```

The session token is a temporary upload capability. It is not the image URL capability. Revoking a session stops further uploads; it does not delete already-created image objects.

## 8. Lessons learned

### A private source repository does not make Pages private

GitHub source visibility and Pages deployment visibility are different layers. Do not put a pretend password in a static frontend and call it authentication.

### Never put GitHub or Cloudflare credentials in browser code

Vite `VITE_*` variables are shipped to the browser. PATs, API tokens, Access secrets, and R2 credentials belong in Workers secrets, GitHub Actions secrets, or Cloudflare-managed bindings.

### Access cannot cover the phone Worker

If Access covers the only Worker, a phone scanning the QR code also has to log in. The split between a protected admin Worker and a token-only public Worker is what makes the QR workflow usable.

### Random URLs are not a full private-file permission system

Unpredictable keys prevent ordinary enumeration; they do not prevent forwarding. Sensitive content needs private objects and signed or authenticated reads.

### QR expiry is not object deletion

A QR code is a temporary upload door. Once an image is stored, delete it or rotate its URL through the admin manager if it should no longer be reachable.

### `r2.dev` is a convenience choice

It is useful for personal or hobby deployments without a domain. A custom R2 domain is a better long-term choice when a stable branded origin, more control, or production operational requirements matter.

### A public root returning 404 is intentional

The phone Worker does not expose a directory or landing page. Only a full tokenized path is meaningful.

## 9. Repository layout

```text
src/
  App.jsx                       admin state and layout
  components/PhoneUploadSheet   QR session sheet
  lib/api.js                    admin API calls
  lib/i18n.js                   Chinese and English copy

worker/src/index.ts             Access-protected admin Worker
worker/src/upload.ts            public temporary upload Worker
worker/src/upload-session.ts    session expiry and limits
worker/wrangler.admin.jsonc     admin Worker config
worker/wrangler.upload.jsonc    upload Worker config
.github/workflows/deploy.yml    two-Worker deployment
```

## 10. Pre-production checklist

- [ ] Replace every `YOUR_*` placeholder.
- [ ] Bind both Workers to the same R2 bucket.
- [ ] Set `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, and `OWNER_EMAILS` on the admin Worker.
- [ ] Protect only the admin Worker with an owner-only Access policy.
- [ ] Keep the phone upload Worker outside Access.
- [ ] Do not commit `.env.production`, PATs, API tokens, Access JWTs, or production QR tokens.
- [ ] Confirm all uploaded content is allowed to be public by exact link.
- [ ] Confirm that closing a QR session makes its old URL return 410.
- [ ] Confirm anonymous admin API requests do not return asset data.
- [ ] For production, consider a custom domain, private objects, and signed URLs.

## 11. License

The code and documentation are released under the MIT License. Demo images and screenshots are included for documentation and testing; replace them with assets you own before using the repository for real data.
