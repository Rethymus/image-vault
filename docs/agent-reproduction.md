# Agent reproduction runbook / Agent 复刻运行手册

This is the deterministic runbook for reproducing the Cloudflare private image-link manager from this repository. It is written so a coding agent can inspect, validate, configure, and—only after explicit approval—deploy the same architecture.

本文是从本仓库一比一复刻 Cloudflare 图片链接管理器的确定性手册。它要求 Agent 先检查、再验证、再配置，并且只有得到明确授权后才能部署同样的架构。

## 0. Give the repository to an Agent / 把仓库交给 Agent

Start with the copyable prompt in [`AGENT_PROMPT.md`](../AGENT_PROMPT.md). The short version is:

```text
Read AGENTS.md, AGENT_PROMPT.md, README.md, and docs/agent-reproduction.md first. Reproduce this repository's Cloudflare Workers + R2 image vault in safe phases. Begin with read-only inspection and local dry-runs. Do not create, delete, deploy, or change Access policies until I explicitly approve that exact phase. Never ask me to paste secrets into chat or source files. Stop on missing placeholders and report a precise checklist.
```

把仓库交给 Agent 后，第一句话可以直接使用：

```text
先读取 AGENTS.md、AGENT_PROMPT.md、README.md 和 docs/agent-reproduction.md。按本仓库的 Cloudflare Workers + R2 图片管理方案分阶段安全复刻：先只读检查和本地 dry-run；没有得到我对具体阶段的明确授权，不得创建、删除、部署资源或修改 Access 策略；不得让我把 secret 粘贴到聊天或源文件；遇到占位符就停下并列出准确的缺项清单。
```

## 1. Expected end state / 目标终态

```text
Owner browser
   │ Cloudflare Access
   ▼
vault-admin Worker + static React UI
   ├── list / delete / rotate image links
   ├── create / revoke temporary upload sessions
   └── poll for completed phone uploads

Phone browser ── no login ──▶ vault-upload Worker
                               └── /s/<random-session-token> only
                                        │
                                        ▼
                                  Cloudflare R2
                                  ├── sessions/<token>
                                  └── i/<random-asset-token>
```

The admin Worker is private. The upload Worker is intentionally public but has no list, delete, or admin route. Image URLs are public-by-link bearer capabilities, not authenticated private downloads.

管理 Worker 是私有入口；上传 Worker 有意保持公开，但没有列表、删除或管理接口。图片 URL 是“持有完整链接即可查看”的 bearer capability，不是登录后私有下载。

## 2. Inputs the owner must supply / 由 owner 提供的输入

The Agent must not invent these values:

| Input | Used by | Safe source |
| --- | --- | --- |
| Cloudflare account ID | Wrangler and Actions | Cloudflare dashboard or Wrangler session |
| Cloudflare API token | Actions only | GitHub repository secret, never chat/source |
| R2 bucket name | both Worker bindings | owner-selected bucket |
| R2 public origin | browser image URLs | `r2.dev` or owner-approved custom domain |
| admin Worker name/host | admin config and Access | owner-selected `workers.dev` name |
| upload Worker name/host | QR URL and upload config | owner-selected `workers.dev` name |
| Access team domain and audience | admin Worker secrets | Cloudflare Access application |
| owner email allowlist | admin Worker secret and Access policy | owner decision |

Agent 不得自行猜测这些值。任何 secret 只能通过 Wrangler secret、GitHub Actions secret 或 Cloudflare 控制台输入。

## 3. Phased procedure / 分阶段流程

### Phase A — Inspect, do not mutate / 阶段 A：只读检查

1. Read `AGENTS.md`, `AGENT_PROMPT.md`, both READMEs, and this runbook.
2. Check Node.js, npm, Wrangler, Git, and the current Git status.
3. Search for `YOUR_` placeholders and ensure no secret-looking files are tracked.
4. Do not run resource-creating commands yet.

### Phase B — Local validation / 阶段 B：本地验证

```powershell
npm ci
npm run worker:types
npm run worker:typecheck
npm run build
npm run worker:upload:dry-run
npm run worker:dry-run
```

The build must use the Worker API mode. If the public image origin is not known yet, use a local placeholder; do not silently substitute a real origin.

### Phase C — Create and configure R2 / 阶段 C：创建并配置 R2

Only after approval:

```powershell
npx wrangler r2 bucket create <bucket-name>
npx wrangler r2 bucket dev-url enable <bucket-name>
```

Put the same `bucket_name` in `worker/wrangler.admin.jsonc` and `worker/wrangler.upload.jsonc`. Set the approved public origin in the Worker vars and build environment. If a custom R2 domain is later adopted, update the origin consistently and consider disabling `r2.dev`.

### Phase D — Deploy the public upload Worker / 阶段 D：部署公开上传 Worker

```powershell
npm run worker:upload:dry-run
npm run worker:upload:deploy
```

The upload Worker root should return 404. A tokenized `/s/<token>` route is the only expected public page.

### Phase E — Configure and deploy the admin Worker / 阶段 E：配置并部署管理 Worker

Set secrets through Wrangler; never commit their values:

```powershell
npx wrangler secret put ACCESS_TEAM_DOMAIN --config worker/wrangler.admin.jsonc
npx wrangler secret put ACCESS_AUD --config worker/wrangler.admin.jsonc
npx wrangler secret put OWNER_EMAILS --config worker/wrangler.admin.jsonc
npm run worker:dry-run
npm run worker:deploy
```

### Phase F — Configure Access / 阶段 F：配置 Access

Create a Self-hosted Access application for the admin Worker destination only. Add an Allow policy for the owner email. Do not include the public upload Worker in that application; otherwise a phone scanning the QR code would be forced to authenticate.

没有自定义域名时，可以直接在 Access 的 Workers destination 中选择 `workers.dev` 的管理 Worker，不需要先添加自己的域名路由。

### Phase G — Online acceptance test / 阶段 G：线上验收

Run the flow with a disposable test image, not a real identity document:

1. Log in to the admin Worker through Access.
2. Create a QR session.
3. Open the tokenized phone URL in a browser without the owner session.
4. Upload one valid image; verify the admin workstation discovers it.
5. Verify invalid MIME/signature and oversized files are rejected.
6. Stop the session; verify the old session URL returns 410.
7. Verify the already-uploaded image URL behaves according to the deliberately chosen bearer-link model.
8. Delete the disposable test asset when finished.

## 4. Acceptance matrix / 验收矩阵

| Check | Expected result |
| --- | --- |
| anonymous admin page/API | blocked by Access or returns unauthorized |
| public upload Worker root | 404 |
| random invalid `/s/<token>` | 404 or expired response |
| valid session page | opens without owner login |
| valid JPG/PNG/WebP | accepted within 8 MB |
| wrong signature, wrong type, oversized file | rejected |
| more than five files | rejected after the limit |
| session timeout / revoke | 410 and no further upload |
| admin workstation | asset appears after polling |
| secret scan | no production secret in source or build |

## 5. GitHub Actions behavior / GitHub Actions 行为

The workflow has two deliberately separate jobs:

1. `Validate Vault` runs on pushes to `main` and on manual runs. It installs dependencies, checks types, builds the UI, and runs both Wrangler dry-runs. It needs no Cloudflare API token.
2. `Deploy both Workers (optional)` runs only when a user manually starts the workflow with `deploy=true`. It checks for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; if they are absent, it records a notice and leaves validation green instead of pretending to deploy.

To enable deployment, configure these in repository settings:

```text
Secrets:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID

Variables:
  PUBLIC_IMAGE_ORIGIN   # optional; otherwise the config fallback is used
```

This design keeps forks and the public reference repository reproducible without leaking or requiring production credentials, while the private maintenance repository can opt into the same deployment gate.

## 6. Stop and ask / 何时必须停下询问

The Agent must stop before any of the following:

- replacing an ambiguous production value;
- creating or deleting an R2 bucket;
- deploying either Worker;
- changing Access policy, owner emails, or public exposure;
- deleting/rotating a real asset;
- enabling GitHub Actions deployment;
- using a real personal document in a test.

When stopped, report: the phase, the exact missing decision/input, the read-only checks already completed, and the next command that would run after approval.
