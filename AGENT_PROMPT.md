# Copyable Agent prompt / 可复制的 Agent 指令

把本仓库交给 Claude Code、Codex、Cursor、Windsurf 或其他能读取仓库并执行终端命令的 Agent 时，可以直接复制下面的指令。它刻意要求 Agent 先诊断和 dry-run，再等待云端变更授权。

When handing this repository to an implementation agent, paste the following prompt first. It intentionally requires inspection and dry-runs before any cloud mutation.

```text
You are reproducing the Cloudflare Private Image Vault from this repository.

Read these files in order before touching code or infrastructure:
1. AGENTS.md
2. AGENT_PROMPT.md
3. README.md
4. README.zh-CN.md and README.en.md
5. docs/agent-reproduction.md
6. docs/architecture.md and docs/troubleshooting.md

Goal:
- deploy an owner-only `vault-admin` Worker with a React/Vite workstation;
- deploy a separate public `vault-upload` Worker that accepts only a short-lived random `/s/<token>` path;
- store assets and temporary session records in one R2 bucket;
- protect only the admin Worker with Cloudflare Access;
- preserve public-by-link image semantics and explain that an exact image URL is a bearer capability;
- keep Chinese/English UI and light/dark/auto appearance behavior intact.

Safe execution contract:
- Begin with read-only inspection. List missing `YOUR_*` values and do not invent them.
- Run local validation and both Wrangler dry-runs before asking for deployment approval.
- Never ask me to paste Cloudflare API tokens, GitHub PATs, Access JWTs, R2 credentials, or owner secrets into chat or source files.
- Do not create/delete buckets, deploy Workers, modify Access policies, delete assets, or rotate real links until I explicitly approve that exact phase.
- Never put a secret in a `VITE_*` variable or committed file.
- Never put the public upload Worker behind the owner-only Access application.
- Never test with a real identity document; use a disposable sample image.

Required local checks:
```powershell
npm ci
npm run worker:types
npm run worker:typecheck
npm run build
npm run worker:upload:dry-run
npm run worker:dry-run
```

When validation is complete, report:
- files and placeholders inspected;
- checks that passed and any first failure;
- Cloudflare inputs still needed;
- the exact next mutation command, but do not run it until I approve it.

After approved deployment, run the acceptance matrix in `docs/agent-reproduction.md`, including anonymous admin blocking, public upload root 404, valid QR upload, invalid-file rejection, session revoke 410, workstation refresh, and a secret/build scan.
```

## What a good Agent response should contain / 合格的 Agent 输出应包含

- a short discovery report before changes;
- an explicit list of missing owner inputs;
- command output summarized by phase, not hidden behind “done”;
- a clear distinction between local validation and cloud mutation;
- a final acceptance matrix with pass/fail evidence;
- no copied secret, live QR token, or personal asset in the patch.
