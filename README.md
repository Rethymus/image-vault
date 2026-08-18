# Cloudflare Private Image Vault

一个可以交给 Agent 直接复刻的个人图片工作站：管理端私有、图片按完整链接公开、链接不可枚举，并支持通过临时二维码从手机上传。

A reproducible personal image workstation for Cloudflare: the admin surface is owner-only, images are public-by-link with unguessable URLs, and a short-lived QR channel lets a phone upload without signing in.

## 先给 Agent / Start with an Agent

本仓库不是只放一份“能运行的代码”，还把复刻入口、停止条件和验收标准写进仓库：

This repository includes an agent entrypoint, safety gates, and an acceptance matrix—not just source code:

- [`AGENT_PROMPT.md`](AGENT_PROMPT.md)：复制给 Codex、Claude Code、Cursor、Windsurf 等 Agent 的启动指令；
- [`AGENTS.md`](AGENTS.md)：仓库级执行约定与不可违反的安全边界；
- [`docs/agent-reproduction.md`](docs/agent-reproduction.md)：从只读检查到线上验收的中英双语 runbook；
- [`README.zh-CN.md`](README.zh-CN.md) / [`README.en.md`](README.en.md)：完整的中文与英文说明。

Recommended first message to an implementation agent:

```text
Read AGENTS.md, AGENT_PROMPT.md, README.md, README.zh-CN.md, README.en.md, and docs/agent-reproduction.md first. Start with read-only inspection and local dry-runs. Do not create, delete, deploy, or change Access policies until I explicitly approve that phase. Never ask for secrets in chat or source files.
```

## 这是什么 / What this is

这是一个面向个人作品集、README 配图、项目截图和偶尔手机上传的图片工作站，而不是私密网盘：

This is an image workstation for portfolios, README assets, project screenshots, and occasional phone uploads—not a private document vault:

- `vault-admin`：Cloudflare Access + Worker 保护的管理工作站；
- `vault-upload`：公开但只接受临时 `/s/<random-token>` 的手机上传 Worker；
- R2：保存图片对象、临时会话和上传标记；
- 图片链接：随机 token 生成的 public-by-link bearer URL；拿到完整链接的人即可查看。

## 架构 / Architecture

```text
Owner browser
      │ Cloudflare Access
      ▼
vault-admin Worker + React workstation
      ├── upload / delete / copy / rotate image links
      ├── create / revoke temporary QR sessions
      └── poll for phone uploads

Phone browser ── no login ──▶ vault-upload Worker
                              └── /s/<session-token> only
                                       │
                                       ▼
                                 Cloudflare R2
                                 ├── sessions/<token>
                                 └── i/<asset-token>
```

The two Workers are deliberately separate: putting the phone Worker behind the owner-only Access application would make QR upload unusable.

## 工作站截图 / Workstation screenshots

完整管理工作站是主界面；二维码面板和手机页面只是其中一条辅助上传路径。截图按中英文、浅色/深色分别提供，二维码截图中的内容只应被当作安全演示，不要把任何生产二维码提交到公开仓库。

The full admin workstation is the primary surface. The QR sheet and phone page are supporting states of that workstation. Screenshots are provided in Chinese/English and light/dark variants; QR images are safe documentation demos, never production upload channels.

### 中文工作站 / Chinese workstation

![中文完整图片工作站](docs/assets/screenshots/zh/admin-assets.png)

![中文深色工作站](docs/assets/screenshots/zh/admin-dark.png)

![中文二维码上传面板](docs/assets/screenshots/zh/qr-phone-upload.png)

![中文手机上传完成](docs/assets/screenshots/zh/phone-upload-success.png)

### English workstation

![English full image workstation](docs/assets/screenshots/en/admin-assets.png)

![English dark workstation](docs/assets/screenshots/en/admin-dark.png)

![English QR upload sheet](docs/assets/screenshots/en/qr-phone-upload.png)

![English phone upload complete](docs/assets/screenshots/en/phone-upload-success.png)

The QR images in these screenshots are documentation-only easter eggs. Never expose a live session token, Access credential, R2 secret, or personal image in public documentation.

## 为什么不是最初的 GitHub Pages 方案？ / Why not the original GitHub Pages idea?

最初的 GitHub 思路是：私密仓库存放图片，GitHub Pages 发布静态文件，用完全随机文件名作为图片 URL，再通过 GitHub 提交触发更新。它适合版本化项目文档，但 GitHub private source 不等于 Pages 私有站点，Pages 也没有真正的运行时上传、Session、数据库权限或服务端管理接口。

The original GitHub idea was: store images in a private repository, publish static files through Pages, use random file names, and let commits trigger deployment. It is good for versioned project documentation, but a private source repository does not make the Pages output private, and Pages does not provide a runtime upload endpoint, server session, database authorization, or admin API.

因此当前方案把实时能力放到 Worker，把对象放到 R2，把 owner-only 边界交给 Access；GitHub 仍然保留为代码、文档、变更记录和可选 CI/CD 的地方。

The current design moves runtime behavior to Workers, objects to R2, and the owner-only boundary to Access. GitHub remains the place for code, documentation, change history, and optional CI/CD.

| 需求 / Need | GitHub Pages | Workers + R2 |
| --- | --- | --- |
| Git 版本化静态素材 / Git-versioned static assets | 强 / Strong | 中 / Medium |
| 浏览器直接上传 / Browser upload | 弱 / Weak | 强 / Strong |
| 手机临时二维码 / Temporary QR upload | 需要额外后端 / Needs another backend | 原生适合 / Natural fit |
| 管理端鉴权 / Server-side admin auth | 需要额外边界 / Needs another boundary | Access + Worker |
| 删除与旋转链接 / Delete and rotate | 提交后等待构建 / Commit + rebuild | 实时 / Runtime |
| 无自定义域名 / No custom domain | 可以 / Yes | `workers.dev` + `r2.dev` 可以 / Yes |

## 谁适合用 / Who should use it

适合当前方案 / Use this repository when you are:

- 个人开发者、作品集维护者或 README 作者；
- 偶尔上传几张图，不想每次手动提交 GitHub；
- 希望手机扫码上传但不想为手机配置登录；
- 能接受“完整图片 URL 等同于查看权限”。

更适合 GitHub Pages / Prefer the original GitHub approach when:

- 图片本身是源码或文档的版本化组成部分；
- 更新频率低，不需要运行时管理；
- 你需要 Git review，并接受 Pages 内容公开。

两种方案都不适合 / Use neither design for：身份证、护照、合同、医疗、财务等必须真正私密、可撤销、可审计的内容。请改用私有 R2 + 短期签名 URL、受保护下载 Worker 或专门的文件管理产品。

## 快速复刻 / Reproduce quickly

```powershell
npm ci
npm run worker:types
npm run worker:typecheck
npm run build
npm run worker:upload:dry-run
npm run worker:dry-run
```

Then follow [`docs/agent-reproduction.md`](docs/agent-reproduction.md). Replace only the `YOUR_*` placeholders with owner-supplied values. The public repository intentionally contains no production Cloudflare names or secrets.

然后按复刻手册执行：先创建/配置 R2，再部署公开上传 Worker，配置管理 Worker secrets，最后给管理 Worker 配置 Access。没有自定义域名时，直接使用 `workers.dev` 和 `r2.dev` 即可。

## GitHub Actions：为什么之前失败、现在怎么运行 / GitHub Actions behavior

之前两个仓库的 Action 在部署上传 Worker 时失败，原因是 GitHub 非交互环境没有 `CLOUDFLARE_API_TOKEN`，不是前端构建失败。现在工作流拆为两层：

Both earlier runs failed at the Wrangler deployment step because a non-interactive GitHub runner had no `CLOUDFLARE_API_TOKEN`; the UI build was not the problem. The workflow now has two layers:

1. `Validate Vault`：push 到 `main` 时自动运行，做依赖安装、类型检查、构建和两个 Wrangler dry-run，不需要 Cloudflare token；
2. `Deploy both Workers (optional)`：只有手动运行并把 `deploy` 设为 `true` 才尝试部署；缺少密钥时只给出 notice，不伪装成已部署。

Configure these only in GitHub repository settings:

```text
Secrets:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID

Variables:
  PUBLIC_IMAGE_ORIGIN   # optional
```

This keeps the public reference repository green for forks while allowing the private maintenance repository to opt into deployment after credentials are configured.

## 安全边界 / Security boundary

- Access 只保护 `vault-admin`；
- `vault-upload` 必须保持公开，但只有随机临时 token 才能打开；
- Worker 服务端验证 Access JWT 和会话 token；
- 所有 secret 使用 Wrangler/Cloudflare/GitHub secret 管理；
- 图片直链是 bearer URL，不是强私有授权；
- 关闭二维码只会阻止后续上传，不会自动删除已经上传的图片。

See [`SECURITY.md`](SECURITY.md), [`docs/architecture.md`](docs/architecture.md), and [`docs/troubleshooting.md`](docs/troubleshooting.md) for the detailed boundary and known trade-offs.

## License

MIT. Demo images and screenshots are documentation assets; replace them with assets you own before using the project for real data.
