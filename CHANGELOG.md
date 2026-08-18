# Changelog

## Unreleased — Agent reproduction hardening

- Added a remote-first, self-contained [`AGENT_PROMPT.md`](AGENT_PROMPT.md) so an implementation Agent can reproduce the workstation in the current workspace without cloning the repository.
- Added [`llms.txt`](llms.txt) as a short machine-readable entrypoint and [`docs/pitfalls.md`](docs/pitfalls.md) as a bilingual failure log and regression checklist.
- Added a dedicated `build:worker` guard so the persistent admin Worker cannot accidentally be published from the browser-only demo build.
- Updated the public reference workflow and Worker scripts to use the guarded build before Wrangler.
- Documented the actual persistence, mock-count, R2 pagination, wrong-origin, duplicate React ID, Access boundary, QR revocation, no-domain, and GitHub Actions failures.

## 未发布版本 — Agent 复刻加固

- 新增自包含远程 [`AGENT_PROMPT.md`](AGENT_PROMPT.md)，Agent 无需先克隆整个仓库即可在当前工作区复刻工作站。
- 新增 [`llms.txt`](llms.txt) 机器友好入口和 [`docs/pitfalls.md`](docs/pitfalls.md) 双语踩坑记录与回归清单。
- 新增 `build:worker` 构建防线，避免把只用于浏览器演示的 demo 构建误发布到持久化管理 Worker。
- 公开仓库的 Worker 命令和 Actions 已改为在 Wrangler 前运行受保护的 Worker 构建。
- 记录真实遇到的持久化、mock 数量、R2 分页、错误 origin、重复 React ID、Access 边界、二维码撤销、无域名和 GitHub Actions 问题。
