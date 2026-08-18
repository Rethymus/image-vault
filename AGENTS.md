# Agent operating contract / Agent 执行约定

This repository is intentionally organized so that an implementation agent can reproduce the deployment from a remote brief or from a checkout. The preferred entrypoint does not require cloning this repository: give the raw `AGENT_PROMPT.md` URL to the Agent and let it implement in the user's current workspace. If this repository is already checked out, read this file first, then read `AGENT_PROMPT.md`, `README.md`, and `docs/agent-reproduction.md` before changing code or creating Cloudflare resources.

本仓库专门按“交给 Agent 即可复刻”的方式组织。推荐直接把 `AGENT_PROMPT.md` 的 raw URL 交给 Agent，不要求先克隆整个仓库；如果仓库已经在当前工作区，Agent 必须先读取本文件、`AGENT_PROMPT.md`、`README.md` 和 `docs/agent-reproduction.md`，再修改代码或创建 Cloudflare 资源。

## Mission / 目标

Reproduce a two-Worker Cloudflare image-link manager:

- `vault-admin`: owner-only management UI and authenticated admin API;
- `vault-upload`: public, token-only temporary phone upload page;
- R2: image objects, session records, and upload markers;
- Access: protects the admin Worker only;
- GitHub Actions: validates every push and deploys only after an explicit manual request.

复刻以下结构：

- `vault-admin`：只有 owner 可以进入的管理界面和管理 API；
- `vault-upload`：公开但只接受临时令牌的手机上传页面；
- R2：保存图片、临时会话和上传标记；
- Access：只保护管理 Worker；
- GitHub Actions：每次 push 做验证，只有明确手动请求时才部署。

## Non-negotiable safety rules / 不可违反的安全规则

1. Read the docs before acting. Do not infer production names from examples.
2. Treat every `YOUR_*` value as an input that must come from the owner. Never invent it.
3. Never request or paste a Cloudflare API token, GitHub PAT, Access JWT, R2 credential, or owner secret into chat, source code, screenshots, or README.
4. Never deploy, delete a bucket, delete assets, rotate live links, or modify an Access policy without explicit owner approval for that exact action.
5. Keep the admin Worker and upload Worker separate. The upload Worker must not be placed behind the owner-only Access application.
6. Preserve the bearer-link warning: an exact public image URL grants viewing access to whoever holds it. This is not a private document vault.
7. Never commit `.env`, `.env.production`, `.wrangler`, `node_modules`, live QR tokens, or real personal assets.
8. Do not put secrets in `VITE_*` variables. Anything in a Vite build is browser-visible.
9. Treat `private-image-vault` R2 as the private manager's source of truth. Do not add seed assets, mock counts, a `remoteCount`, or a first-12-items cap to private mode.
10. Never publish the admin Worker from a plain browser/demo build. Use `npm run build:worker`, which forces Worker API mode and checks the public image origin.

## Default behavior / 默认行为

The first pass is read-only and local:

```text
inspect → identify missing inputs → dry-run → typecheck → build → ask before cloud mutation
```

第一轮只能做本地检查和 dry-run：

```text
检查仓库 → 列出缺少的配置 → dry-run → 类型检查 → 构建 → 云端变更前征求确认
```

Do not create a bucket, deploy a Worker, or alter Access merely because a placeholder is present. If a required value is missing, stop at that phase and report the exact value and where the owner should provide it.

## Required validation / 必须验证

Before any approved deployment, run:

```powershell
npm ci
npm run worker:types
npm run worker:typecheck
npm run build:worker
npm run worker:upload:dry-run
npm run worker:dry-run
```

For the separate GitHub Pages showcase, run `npm run build` with `VITE_API_MODE=demo` and the Pages base path; never reuse that demo build for the admin Worker.

After an approved deployment, verify the acceptance matrix in `docs/agent-reproduction.md`: Access blocks anonymous admin traffic, the public root is 404, a valid QR session works without login, unsupported/oversized files are rejected, revocation returns 410, and uploaded assets appear in the admin workstation.

## Stop conditions / 必须暂停的情况

Pause and ask the owner when:

- a placeholder or production value is ambiguous;
- a command would create, delete, or overwrite Cloudflare resources;
- Access policy, owner email, R2 public exposure, or bearer-link behavior would change;
- a test would upload or delete a real personal file;
- a deployment credential is missing.

If validation fails, diagnose the first failing step and show the smallest safe repair. Do not skip the failing check just to make the workflow green.
