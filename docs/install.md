# Image Vault — Installation / Reproduction Guide

## For humans

Copy one line to your AI implementation Agent:

```text
帮我复刻 Image Vault 图片工作站：https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md
```

English:

```text
Help me reproduce the Image Vault workstation: https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md
```

This is a remote implementation brief, not a command to clone this repository. The Agent should read this document, inspect the workspace it is already working in, and build the workstation there. A full repository checkout is optional, not a prerequisite.

已经复刻过、现在要同步修复或更新时，复制这一句：

```text
帮我更新当前工作区的 Image Vault 图片工作站：https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/update.md
```

## For implementation Agents

### Goal

Implement a working Apple-inspired Image Vault workstation in the user's current workspace. Build or adapt the existing project in place; do not clone this repository and do not replace unrelated user work.

The workstation has two runtime surfaces:

1. `vault-admin`: an owner-only Cloudflare Worker with the full desktop/mobile workstation;
2. `vault-upload`: a public, token-only Worker used by a short-lived QR session on a phone.

Cloudflare R2 is the private manager's source of truth. GitHub Pages is only a browser-only showcase and must never be treated as the production data source.

### Safety boundaries

Start with read-only inspection. Before the user explicitly approves the exact cloud-mutation phase, do not:

- create, delete, or empty an R2 bucket;
- deploy either Worker;
- create or change Cloudflare Access applications or policies;
- delete or rotate a real image link;
- create GitHub Actions secrets or request a secret in chat;
- overwrite unrelated files, user configuration, or existing assets.

Never put Cloudflare tokens, Access credentials, R2 secrets, or private image URLs in source code, Vite variables, screenshots, logs, or chat. If an owner value is missing, stop and report the placeholder instead of guessing it.

### Product contract

Implement the complete workstation, not only a QR screen:

- Apple-inspired light, dark, and system appearance with consistent surfaces, blur, focus states, contrast, and motion;
- Chinese/English language switching for every visible user-facing string;
- responsive desktop and phone layouts with no horizontal overflow;
- real asset count derived from the current asset array;
- every asset returned by the data source, not only the first 12;
- image cards with preview, type, size, upload time, copy URL, copy HTML, copy Markdown, delete, and rotate-link actions;
- drag-and-drop and file-picker upload with JPG/PNG/WebP validation and an 8 MiB limit;
- a QR sheet in the admin workstation and a no-login, tokenized phone upload page;
- an explicitly labelled GitHub Pages demo with no persistence.

### Persistence contract

The private admin UI must initialize from the Worker API, not from conceptual images or mock counters:

```text
GET    /api/assets
POST   /api/assets
DELETE /api/assets/<43-character-random-token>
POST   /api/assets/<token>/rotate
POST   /api/upload-sessions
DELETE /api/upload-sessions/<session-token>
```

The admin Worker must list every R2 page, follow `truncated`/`cursor`, sort by the actual upload timestamp, and return real metadata and public URLs. Do not add `remoteCount`, seed assets, hard-coded resource totals, or `slice(0, 12)`. Upload, refresh, delete, and rotate must remain correct after a new page load.

Public image URLs must use the owner-provided `PUBLIC_IMAGE_ORIGIN` and the approved random-token format:

```text
https://<approved-r2-origin>/i/<43-character-random-token>
```

Never use `https://img.example.com` or another documentation placeholder in a production Worker build.

### QR upload contract

The public upload Worker is intentionally outside Cloudflare Access. A session is short-lived (about 10 minutes), accepts at most five images, validates file signatures and size, and stores temporary upload markers in R2. It exposes only the session route:

```text
GET  /s/<session-token>
POST /s/<session-token>/upload
POST /s/<session-token>/revoke
```

The admin Worker polls for completed uploads. Revoking a QR session invalidates the temporary channel; it does not silently delete an already persisted image. The upload Worker root returning 404 is acceptable and intentional.

### GitHub Pages demo contract

The Pages build is separate from the Worker build. It may contain the six documentation images and browser-only simulated uploads, but it must:

- derive its displayed count from the current browser array;
- render the complete current array;
- show a clear “demo only / no persistence” notice;
- reset its local state on refresh;
- never send files to R2, a Worker, GitHub, or a database;
- never contain production image URLs, Access credentials, tokens, or sensitive assets.

Do not reuse the demo build for `vault-admin`. The Worker build must force persistent Worker mode and verify the approved public image origin during build/dry-run.

### Required execution order

1. Inspect the current workspace, package manager, Git status, existing routes, bindings, and environment placeholders.
2. Preserve unrelated user work and decide whether to adapt an existing project or scaffold the workstation locally.
3. Implement the workstation, persistence API, R2 pagination, QR session boundary, bilingual UI, and separate demo mode.
4. Run local type checks, the guarded Worker build, Worker dry-runs, and browser checks for blank-page, console, responsive, upload, delete, count, and QR states.
5. Report missing owner inputs and exact cloud changes. Stop and wait for explicit approval.
6. Only after approval, create/select R2, configure secrets through secret storage, deploy both Workers, configure Access for `vault-admin` only, and perform online acceptance with disposable assets.

Use the detailed technical contract in [`AGENT_PROMPT.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/AGENT_PROMPT.md) when an implementation detail is not covered here. Before touching data-source or CI code, read [`docs/pitfalls.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/pitfalls.md).

### Acceptance matrix

Do not report success without evidence for these checks:

| Area | Expected result |
| --- | --- |
| Anonymous admin | Access redirect/denial; no asset data is exposed |
| Private list | All R2 pages are included; count equals returned assets |
| Private upload | New card, working public URL, survives refresh |
| Private delete | API succeeds and asset remains gone after refresh |
| Private rotate | Old link is invalidated and new link works |
| QR session | Phone opens without owner login, accepts only valid temporary uploads |
| Session revoke | Old session URL returns the documented revoked response |
| Public demo | Count and cards transition with the browser array; refresh resets state |
| Mobile UI | No horizontal overflow, no console errors, light/dark both readable |
| Worker build | No demo API mode or demo image origin remains in the production bundle |

The final report must distinguish persisted private assets from non-persistent Pages demo state and must state when authenticated online acceptance was not possible.

