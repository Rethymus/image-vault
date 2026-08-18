# Image Vault — remote Agent implementation brief

This file is the detailed remote, self-contained implementation brief for the Image Vault workstation. It is intentionally usable without cloning this repository. The human-facing one-line installation entrypoint is [`docs/install.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md); the update entrypoint is [`docs/update.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/update.md). This file remains available as the deep technical contract for Agents that need the full API, build, safety, and acceptance details.

本文件是 Image Vault 图片工作站的详细、远程、自包含复刻说明。它不要求 Agent 先克隆本仓库；面向使用者的一句话安装入口是 `docs/install.md`，已有实现的更新入口是 `docs/update.md`。需要完整 API、构建、安全和验收细节时，Agent 可以直接读取本文件。

## Copy this to an Agent / 直接复制给 Agent

Chinese:

```text
帮我复刻 Image Vault 图片工作站：https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md
```

English:

```text
Help me reproduce the Image Vault workstation: https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md
```

## Mission / 目标

Build a working personal image workstation, not only a visual mockup:

- an owner-only `vault-admin` Cloudflare Worker with a React/Vite workstation;
- a separate public `vault-upload` Worker for short-lived phone upload sessions;
- one Cloudflare R2 bucket for image objects and temporary session records;
- Cloudflare Access on the admin Worker only;
- random bearer URLs that can be embedded directly in Markdown or HTML;
- Chinese/English switching, light/dark/system appearance, responsive desktop and phone layouts;
- drag-and-drop upload, image preview, copy URL/HTML/Markdown, delete, and rotate-link actions;
- a QR sheet in the admin workstation and a no-login tokenized phone page;
- a clearly labelled browser-only GitHub Pages showcase with no persistence.

不要只实现一个看起来相似的页面。最终必须同时具备真实的管理 API、R2 持久化、临时二维码上传、安全边界、验收测试和清晰的演示/生产区分。

## Product contract / 产品契约

### Admin workstation

The primary surface is a calm Apple-inspired workstation rather than a QR-only page:

- top bar with Vault identity, language switch, appearance switch, QR upload entry, and Add images;
- resource count is derived from the current asset array, never a hard-coded number;
- the main grid shows every resource returned by the data source, not only the first 12;
- cards show image, name, type, size, date, copy action, and an action menu;
- upload supports JPG/PNG/WebP, drag-and-drop, queue progress, metadata options, and clear errors;
- dark mode must cover the whole shell, cards, sheets, controls, QR panel, and phone view;
- phone layouts use the same responsive rules and do not horizontally overflow;
- all visible user-facing strings have Chinese and English translations.

### Persistent private mode

The private manager is the source of truth for real use:

```text
GET    /api/assets                         list every R2 asset
POST   /api/assets                         validate and persist one image
DELETE /api/assets/<43-char-token>         delete the R2 object
POST   /api/assets/<token>/rotate           copy to a new token and delete old object
POST   /api/upload-sessions                create a temporary phone session
DELETE /api/upload-sessions/<token>        revoke that session
```

The Worker must list all R2 pages (`truncated`/`cursor`), sort by actual upload time, and return real metadata and URLs. The UI must initialize from `GET /api/assets`; it must not seed conceptual images, keep a fake `remoteCount`, or slice the list to 12. After upload, refresh, and delete, R2 must remain the source of truth.

The public image URL is built from the owner-provided `PUBLIC_IMAGE_ORIGIN` and has this shape:

```text
https://<approved-r2-origin>/i/<43-character-random-token>
```

Do not fall back to `img.example.com` or another demo origin in a production Worker build.

### Temporary phone upload

The phone Worker is intentionally outside Access:

- only `/s/<43-character-random-session-token>` is meaningful;
- the root may return 404;
- sessions expire after about 10 minutes and allow at most 5 images;
- accept only JPEG, PNG, and WebP with matching file signatures and an 8 MiB limit;
- revoke must stop further uploads and return 410 for the old session;
- an uploaded image remains a normal bearer URL until the owner deletes or rotates it;
- the phone Worker has no list, delete, or admin endpoint.

Putting Access on the upload Worker breaks the QR use case because an unauthenticated phone would be forced to sign in.

### Public GitHub Pages showcase

The Pages build is a browser-only showcase:

- build it with `VITE_API_MODE=demo` and the Pages base path;
- seed only the documentation images shipped for the showcase;
- count `assets.length` and render the complete current array;
- upload/delete update the current browser session, so the count and cards stay consistent;
- refreshing the Pages demo resets it to the seed state by design;
- never present the demo as R2-backed or suitable for personal documents.

## Architecture / 架构

```text
Owner browser ── Cloudflare Access ──▶ vault-admin Worker
                                      ├── React/Vite static assets
                                      ├── authenticated /api/*
                                      └── R2 binding

Phone browser ── token only ─────────▶ vault-upload Worker
                                      └── same R2 bucket, no admin API

Public image URL ────────────────────▶ approved R2 public origin /i/<token>
```

The admin Worker may serve the static UI through a Worker Assets binding. The public Pages showcase is a separate demo deployment and must not be used as the private manager.

## Build invariants / 构建不变量

When a Worker is built, the build command must force and verify:

```text
VITE_API_MODE=worker
VITE_API_BASE_URL=             # same-origin /api/*
VITE_PUBLIC_IMAGE_ORIGIN=<approved origin or explicit placeholder>
```

Use a dedicated `build:worker` command. It must fail if the bundle still contains the demo API mode or `https://img.example.com`; the approved image origin must also be passed consistently to the Worker runtime variables and verified by the Wrangler dry-run. GitHub Actions must run this Worker build before Wrangler uploads `dist`; a plain browser demo build must never be used for the admin Worker.

## Safety contract / 安全边界

1. Read this remote brief before modifying the current workspace.
2. Do not clone this repository unless the user explicitly asks for source comparison. The brief is the implementation input; use the current workspace as the destination.
3. Inspect first. List missing `YOUR_*` values and ambiguous decisions before cloud changes.
4. Never invent an account ID, bucket, Worker name, Access audience, owner email, R2 origin, or production URL.
5. Never ask the user to paste a Cloudflare API token, GitHub PAT, Access JWT, R2 credential, QR token, or other secret into chat or source files.
6. Never put credentials in `VITE_*`, committed files, screenshots, or logs.
7. Do not create/delete R2, deploy, change Access, delete real assets, or rotate real URLs without explicit approval for that exact phase.
8. Use disposable sample images only. Never test with an identity document or real résumé.
9. Treat a complete image URL as bearer access. Randomness prevents enumeration; it does not prevent forwarding.
10. Stop on the first failed validation step and report the smallest safe repair.

## Execution protocol / 执行协议

### Phase 0 — Remote brief and read-only discovery

- Read this file only; follow linked documents only when the current phase needs them.
- Inspect the current workspace, existing framework, package manager, Git status, and available Cloudflare/Wrangler tools.
- Decide whether to scaffold a fresh app or adapt an existing app.
- List owner inputs and stop before cloud mutation.

### Phase 1 — Local implementation

- Implement the workstation and the two Worker routes in the current workspace.
- Add the bilingual copy, light/dark/system tokens, responsive states, and safe demo boundary.
- Add `build:worker`, type checking, local preview, and tests for the state transitions.
- Confirm that private mode contains no seed/mock assets and that public demo mode is explicitly non-persistent.

### Phase 2 — Local validation and dry-run

Run the equivalent checks available in the workspace:

```powershell
npm ci
npm run worker:types
npm run worker:typecheck
npm run build:worker
npm run worker:upload:dry-run
npm run worker:dry-run
```

For the Pages showcase, separately run the demo build with `VITE_API_MODE=demo` and the correct base path. Use a real browser test for blank-page, console errors, desktop, mobile, upload, delete, and count consistency.

### Phase 3 — Explicit cloud approval

Report the exact commands and resources that will be changed. Wait for approval before creating a bucket, writing secrets, deploying a Worker, configuring Access, or deleting a test object.

### Phase 4 — Deployment

- create or select one R2 bucket;
- bind the same bucket to both Workers;
- deploy the public phone Worker without Access;
- set admin Worker secrets through Wrangler/Cloudflare secret storage;
- deploy the admin Worker with the verified Worker build;
- configure Access for the admin Worker only;
- keep GitHub Actions validation separate from optional deployment.

### Phase 5 — Acceptance

Use a disposable image and record evidence for every row:

| Check | Expected result |
| --- | --- |
| anonymous admin | Access redirect/denial, no asset data |
| upload Worker root | 404 is acceptable and intentional |
| valid QR session | opens without owner login |
| valid JPG/PNG/WebP | accepted within 8 MiB |
| wrong signature/type/size | rejected |
| session revoke | old URL returns 410 |
| private upload | card appears, URL opens, survives refresh |
| private delete | API returns 204 and remains gone after refresh |
| private list | count equals returned assets and includes all pages |
| public demo | count/card transition is 6 → 7 → 6 in one session |
| public mobile | no horizontal overflow and no console errors |
| build scan | no demo API mode or demo origin in Worker bundle |

## Required final report / Agent 最终报告

Return a compact evidence report containing:

- what was discovered and whether the workspace was scaffolded or adapted;
- owner inputs still missing, without printing their values;
- files changed and why;
- local checks and their results;
- cloud mutations and their exact targets, only if approved;
- online acceptance results and known limitations;
- a clear distinction between persisted private assets and non-persistent Pages demo state.

Do not end with “done” if the private authenticated flow was not tested. State that boundary explicitly.

## Additional remote references / 按需读取的补充文档

These are optional follow-up documents. Fetch only the one needed for the current phase; do not clone the repository:

- [`docs/install.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md) — one-line human-facing installation/reproduction entrypoint;
- [`docs/update.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/update.md) — one-line human-facing update entrypoint;
- [`llms.txt`](https://raw.githubusercontent.com/Rethymus/image-vault/main/llms.txt) — short machine-readable index;
- [`docs/pitfalls.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/pitfalls.md) — failures found while building this project and regression guards;
- [`docs/agent-reproduction.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/agent-reproduction.md) — detailed bilingual runbook;
- [`docs/architecture.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/architecture.md) — architecture notes;
- [`docs/troubleshooting.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/troubleshooting.md) — symptom-based troubleshooting.
