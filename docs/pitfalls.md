# Image Vault pitfalls and regression guards / 踩坑记录与回归防线

This document records failures that actually occurred while building and deploying this workstation. It is part of the implementation contract: an Agent must use these cases as regression tests, not treat them as historical trivia.

本文记录这个工作站在设计、部署和线上验证过程中真实遇到的问题。它不是普通的经验分享，而是复刻时必须转化为检查项的回归防线。

## 1. R2 binding enabled does not prove that the UI uses R2

### Symptom / 症状

The Cloudflare dashboard showed an R2 binding, but uploads disappeared after refresh and the asset list did not match the bucket.

Cloudflare 控制台显示 R2 已绑定，但页面上传后刷新消失，资源列表也与桶内实际对象不一致。

### Root cause / 根因

The Worker was deployed with a normal Vite build. Because `VITE_API_MODE` was not forced, the browser bundle used the demo API mode. The binding existed, but the rendered UI never called the persistent `/api/*` routes.

Worker 虽然绑定了 R2，但发布时执行的是普通 Vite 构建。没有强制注入 `VITE_API_MODE=worker`，浏览器 bundle 退回 demo 模式；R2 绑定存在，却没有被当前页面使用。

### Guard / 防线

- use a dedicated `build:worker` command;
- force `VITE_API_MODE=worker` and same-origin `VITE_API_BASE_URL`;
- scan the bundle for the demo mode and demo image origin;
- run a real authenticated upload → refresh → delete → refresh test.

不要只看 Bindings 页面。必须检查最终 bundle 和真实 API 请求。

## 2. A fake count hides a broken data source

### Symptom / 症状

The UI showed a plausible number even when the API returned no assets. Refreshing, uploading, and deleting produced contradictory counts.

即使 API 没有返回资源，界面仍显示一个看起来合理的数量；刷新、上传和删除后数量互相矛盾。

### Root cause / 根因

The old UI kept a separate `remoteCount` and used an expression based on a seed number. That made the number independent of the actual array.

旧界面维护了独立的 `remoteCount`，并使用基于 seed 数量的表达式。数量和真正渲染的数据不是同一个来源。

### Guard / 防线

`assetCount` must be exactly `assets.length`. Upload and delete must update the same array that renders the grid. There must be no `12 + ...`, fake remote count, or hidden fallback assets in private mode.

`assetCount` 必须严格等于 `assets.length`。上传和删除必须修改渲染网格使用的同一个数组。私有模式禁止 `12 + ...`、独立 mock count 和隐藏 fallback 资源。

## 3. The first R2 page is not the whole vault

### Symptom / 症状

Only recent assets appeared. Older objects existed in R2 but were absent from the workstation.

页面只显示最近资源；R2 里明明有旧对象，但管理端看不到。

### Root cause / 根因

The list endpoint read one page and returned `nextCursor`, while the UI did not implement pagination. The front end also capped the list with `slice(0, 12)`.

列表接口只读取一页并返回 `nextCursor`，前端却没有分页；同时 UI 还用 `slice(0, 12)` 截断了列表。

### Guard / 防线

The Worker must follow every `truncated` cursor, merge all objects, sort by the real `uploaded` timestamp, and return the complete list. The UI must render the complete response.

Worker 必须循环跟随所有 `truncated` cursor，合并对象并按真实 `uploaded` 时间排序；前端必须渲染完整响应。

## 4. A demo fallback origin creates unusable image URLs

### Symptom / 症状

An uploaded asset returned a URL, but opening it did not display the image.

上传接口返回了 URL，但复制到新标签页后图片打不开。

### Root cause / 根因

The browser bundle still contained a placeholder/demo origin such as `https://img.example.com`, or the Worker build and Worker variable used different origins.

浏览器 bundle 仍然包含 `https://img.example.com` 之类的演示域名，或者 Worker 构建注入的 origin 与 Worker 变量不一致。

### Guard / 防线

Use one owner-approved `PUBLIC_IMAGE_ORIGIN`, inject it during the Worker build, verify it is present in the bundle, and reject a build that still contains the demo origin.

只使用一个 owner 确认的 `PUBLIC_IMAGE_ORIGIN`，在 Worker 构建时注入并扫描 bundle；残留演示域名时直接让构建失败。

## 5. Duplicate React IDs make delete appear broken

### Symptom / 症状

After deleting one card, a visually identical card remained and the count looked wrong.

删除一张卡片后页面仍残留一张看起来相同的卡片，数量也不对。

### Root cause / 根因

Two seeded demo assets shared the same React `key`/ID. React reused the DOM node, so the data operation succeeded but the rendered result was stale.

两个演示资源复用了同一个 React `key`/ID。数据操作实际成功，但 React 复用 DOM 后造成视觉残留。

### Guard / 防线

Every asset ID must be unique. The browser test must assert the complete transition `6 → 7 → 6`, not only that a delete request was fired.

所有资源 ID 必须唯一。浏览器测试必须断言完整的 `6 → 7 → 6` 状态变化，不能只检查点击事件是否触发。

## 6. Public demo state and private persistence are different contracts

### Symptom / 症状

Developers expected a GitHub Pages upload to remain after refresh, or copied the demo implementation into the private Worker.

开发者期待 GitHub Pages 上传刷新后仍存在，或者把演示实现直接发布到了私有 Worker。

### Root cause / 根因

The Pages site is intentionally browser-only. It uses documentation seed assets and local session state. The private site must start from an empty state and load real R2 assets.

Pages 站点本来就是浏览器内演示，使用文档 seed 资源和本地会话状态；私有站点必须从空状态开始并读取真实 R2。

### Guard / 防线

Keep separate build modes and labels. Demo count means the current browser array; private count means the current R2 response. Never use demo fallback assets in private mode.

保持构建模式与界面提示分离。演示数量代表当前浏览器数组；私有数量代表 R2 响应。私有模式禁止 demo fallback。

## 7. Access must protect only the admin Worker

### Symptom / 症状

The QR page redirected to a login screen on the phone.

手机扫描二维码后被 Access 拦截并要求登录。

### Root cause / 根因

The public upload Worker was included in the owner-only Access application.

公开手机上传 Worker 被加入了 owner-only Access 应用。

### Guard / 防线

Protect `vault-admin` only. Keep `vault-upload` public at the edge and authorize each upload by a short-lived random session token.

只保护 `vault-admin`。`vault-upload` 在边缘保持公开，通过短期随机 session token 授权单次上传通道。

## 8. QR revocation does not delete an already-uploaded image

### Symptom / 症状

Closing the QR panel stopped new uploads, but a previously uploaded image URL still worked.

关闭二维码面板后新上传停止了，但之前已经上传的图片 URL 仍然有效。

### Root cause / 根因

The session token and the asset token are different capabilities. Revoking the session only removes the upload door and markers.

session token 和 asset token 是两种不同权限。撤销 session 只关闭上传入口和标记，不会自动删除已经写入的图片。

### Guard / 防线

State this in the UI and docs. Delete or rotate the image separately from the admin workstation when its bearer URL must stop working.

在界面和文档中明确说明。需要让图片 URL 失效时，必须在管理端单独删除或旋转图片。

## 9. A public root returning 404 is intentional

### Symptom / 症状

Opening the upload Worker hostname directly looked like a broken deployment.

直接打开上传 Worker 域名根路径时返回 404，看起来像部署失败。

### Root cause / 根因

The public Worker intentionally exposes only tokenized `/s/<token>` pages and no directory or admin landing page.

公开 Worker 有意只暴露带 token 的 `/s/<token>` 页面，不提供目录或管理首页。

### Guard / 防线

Accept root `404` as a security and surface-design property. Test a valid session URL separately.

把根路径 `404` 视为安全与界面设计的一部分；另行测试有效 session URL。

## 10. GitHub Actions validation and deployment are separate

### Symptom / 症状

The build was correct, but the Action was red at the Wrangler deployment step.

构建本身正确，但 Action 在 Wrangler 部署步骤失败。

### Root cause / 根因

GitHub-hosted runners do not inherit a local Wrangler login. Deployment needs repository secrets, while validation and dry-runs do not.

GitHub runner 不会继承本机 Wrangler 登录态。部署需要仓库 secrets，而验证和 dry-run 不需要。

### Guard / 防线

Run validation on every push. Make cloud deployment manual and conditional on `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never call a skipped deployment “deployed”.

每次 push 都运行验证；云端部署手动触发，并明确检查两个 secrets。部署被跳过时不能声称已经发布。

## 11. No custom domain is required, but the trade-off is real

### Symptom / 症状

The Cloudflare dashboard did not show a domain route, so setup appeared blocked.

Cloudflare 控制台找不到自定义域名路由，看起来像无法继续。

### Root cause / 根因

Workers can use `workers.dev`, and an R2 development URL can serve public-by-link images. A custom domain is optional for this personal use case.

个人场景可以直接使用 `workers.dev` 和 R2 的开发域名；自定义域名不是前置条件。

### Guard / 防线

Configure Access for the Worker destination directly. Document `r2.dev` as a convenience/hobby choice, not as a full private CDN or enterprise boundary.

直接把 Access 目标设为 Worker；同时明确 `r2.dev` 只是个人/hobby 便利方案，不是完整的私有 CDN 或企业级边界。

## 12. Do not claim private online acceptance without an Access session

### Symptom / 症状

An anonymous test could confirm the Access redirect but could not prove upload, delete, or the actual R2 count.

匿名测试可以确认 Access 跳转，却不能证明上传、删除或 R2 实际数量。

### Root cause / 根因

The admin API is deliberately protected. A test report that says “private upload verified” without an authenticated session is overstating evidence.

管理 API 本来就应被保护。没有 authenticated session 却声称“私有上传已验证”属于夸大验收证据。

### Guard / 防线

Report anonymous protection and authenticated behavior separately. Ask the owner to perform the final disposable-image test in an Access-authenticated browser; never bypass Access or request its token in chat.

将匿名保护和登录后行为分开报告。最后的临时图片测试应由 owner 在已登录 Access 的浏览器中完成；不要绕过 Access，也不要索要 token。

## 13. CI environment overrides can reintroduce a fixed bug

### Symptom / 症状

The local guarded Worker build passed, but the GitHub Actions dry-run failed because it still saw the old demo image origin.

本地受保护的 Worker 构建已经通过，但 GitHub Actions 的 dry-run 仍然因为旧的演示图片 origin 失败。

### Root cause / 根因

The workflow passed its own `VITE_PUBLIC_IMAGE_ORIGIN` value to the command. That value still used `https://img.example.com`, so the CI environment overrode the safer fallback in `build:worker`.

工作流自己向命令传入了 `VITE_PUBLIC_IMAGE_ORIGIN`，但这个值还残留 `https://img.example.com`；CI 环境变量覆盖了 `build:worker` 的安全占位符。

### Guard / 防线

Keep one canonical placeholder and use it consistently in the build step, dry-run step, and deploy step. Remove redundant `VITE_API_MODE` overrides when the dedicated build script owns that invariant. Test the exact GitHub Actions environment, not only the local default.

构建、dry-run 和部署步骤必须统一使用同一个安全占位符。由专用构建脚本负责 `VITE_API_MODE` 时，不要在 workflow 中重复覆盖。不能只测试本地默认值，还要测试 Action 的完整环境变量组合。

## Regression checklist / 回归清单

- [ ] Worker bundle forces `worker` API mode and contains the approved image origin.
- [ ] Private list reads every R2 page and renders every returned asset.
- [ ] Private count is `assets.length`; there is no mock counter or seed fallback.
- [ ] Public demo count/card transition is `6 → 7 → 6` in one browser session.
- [ ] Public demo resets only after refresh and is labelled non-persistent.
- [ ] QR Worker is outside Access; admin Worker remains owner-only.
- [ ] Root upload Worker 404 is treated as expected.
- [ ] R2 objects are never deleted during ordinary build/deploy verification.
- [ ] Private authenticated upload/delete is not claimed until tested with a disposable file.
- [ ] CI build, dry-run, and deploy steps use the same non-demo image-origin fallback.
