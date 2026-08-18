# Cloudflare 私有图片链接管理器：完整中文说明

这是一个面向个人、小型作品集和 README 配图场景的图片链接管理器。它不是传统意义上的“完全私有网盘”，而是：

> 管理端私有、图片按完整链接公开、链接不可枚举、手机可以通过临时二维码上传。

当前实现使用：

- Cloudflare Worker：管理端和公开手机上传端；
- Cloudflare R2：保存图片和临时上传会话；
- Cloudflare Access：保护管理端，只允许 owner 进入；
- GitHub Actions / Wrangler：部署 Worker 和静态前端；
- React + Vite：管理端界面；
- `qrcode`：在管理端浏览器里生成二维码。

## 1. 为什么最初考虑 GitHub private repo + GitHub Pages？

最开始的思路很自然：

1. 把图片存进 GitHub private repository；
2. 用 GitHub Pages 发布图片或一个静态站点；
3. 使用完全随机的文件名作为图片 URL；
4. 需要上传时直接向仓库提交文件；
5. 通过公开的图片链接把图片嵌入 README、作品集或网页。

这个思路有一些优点：

- Git 版本历史清晰；
- 所有源文件集中在 GitHub；
- 对静态文档、项目截图和构建产物很直观；
- 不需要自建服务器；
- GitHub Actions 可以自动触发发布。

但是它有一个必须正视的边界：

> GitHub private repository 不等于 GitHub Pages 私有站点。

源仓库可以是 private，但 Pages 的发布内容仍可能被互联网上的访客访问。GitHub Pages 也没有普通后端服务那样的登录 Session、数据库权限和服务端上传接口。

因此下面这些做法不能构成真正的安全边界：

```js
if (password === "some-password") {
  showAdminPanel();
}
```

前端密码会出现在浏览器下载的 JavaScript 或 HTML 中；把 GitHub PAT、R2 secret 或 API Key 放进 Pages 前端更危险。

## 2. 为什么后来改为 Worker + R2？

需求逐渐明确后，实际场景是：偶尔上传几张头像、简历配图、README 图片或项目展示图，希望：

- 不必每次登录 GitHub 手动提交；
- 不需要自己的域名；
- 管理端只对自己开放；
- 手机可以临时上传；
- 图片链接能够直接嵌入 Markdown/HTML；
- 维护成本尽可能低。

所以最终采用了两个 Worker：

```text
vault-admin
  ├── Cloudflare Access owner-only
  ├── React 管理界面
  ├── 创建/撤销临时上传会话
  ├── 图片列表、删除、随机链接旋转
  └── 通过 R2 binding 操作对象

vault-upload
  ├── 不设置 Access，方便手机打开
  ├── 只接受 /s/<43 字符随机令牌>
  ├── 10 分钟有效期
  ├── 每个会话最多 5 张图片
  └── 没有列表、删除或管理接口
```

R2 负责对象存储；管理端会把会话根对象写入 `sessions/<token>`，每张手机上传的图片会写入 `i/<asset-token>`，并写入会话上传标记。会话到期或 owner 点击“停止并关闭”后，上传通道失效。

## 3. 两种方案的优缺点

### 原始 GitHub Pages 方案

优点：

- 结构简单，全部内容可以进入 Git；
- 适合项目文档、静态图片和可审计的发布流程；
- GitHub Actions 的历史和变更容易查看；
- 不需要独立的对象存储服务。

缺点：

- Pages 发布内容不应被当作私有内容；
- 上传本质上是提交并等待构建发布；
- 没有自然的运行时上传接口；
- 如果把管理页面也发布出去，必须额外处理 Access 或其他边界；
- 不适合频繁上传、删除、旋转链接和手机临时上传；
- 图片和提交历史会绑定在 Git 仓库生命周期中。

### 当前 Worker + R2 方案

优点：

- 管理端可以直接在网页上传；
- 手机通过临时二维码上传，无需登录；
- 管理接口由 Worker 和 Access 在服务端验证；
- R2 对象不需要随每次图片上传重新构建整个站点；
- 资产列表、删除和随机链接旋转都可以实时完成；
- 不需要自定义域名，`workers.dev` 和 `r2.dev` 即可运行；
- 随机 256-bit token 让 URL 不可现实枚举。

缺点：

- 图片直链仍然是 Bearer URL：拿到完整链接的人就能查看；
- `r2.dev` 更适合个人或 hobby 使用，并不是完整的生产 CDN/自定义域名方案；
- 需要配置 Cloudflare Access、R2、Worker secrets 和 GitHub Actions secrets；
- 公开手机 Worker 必须保持公开，否则手机端会被 Access 拦住；
- 二维码失效不会自动删除已经上传的图片；
- 这是单 owner 工具，不包含团队权限、审计、配额和数据库。

## 4. 谁应该使用哪一种？

### 适合当前方案的人

- 个人开发者；
- 个人作品集或技术博客维护者；
- 偶尔需要从手机往电脑端图片库放几张图的人；
- 需要将图片嵌入 README、HTML 或作品集的人；
- 能接受“完整链接即拥有查看权”的人；
- 不想购买域名或维护服务器的人。

### 更适合原始 GitHub Pages 方案的人

- 图片是项目源码的一部分；
- 需要每一次变更都能通过 Git review；
- 图片很少更新；
- 不需要网页端实时上传；
- 接受 Pages 发布内容公开；
- 希望只维护一个 GitHub 仓库和一个 Actions 工作流。

### 两种方案都不适合的内容

不要使用本仓库公开图片直链存放：

- 身份证、护照、证件照原件；
- 未公开的简历原件；
- 合同、财务文件、医疗文件；
- 必须满足访问撤销的敏感资料；
- 任何需要逐用户授权或下载审计的文件。

这类内容应该使用私有 R2、短期签名 URL、Cloudflare Access 保护的下载 Worker，或专门的文件管理产品。

## 5. 复刻部署流程

### 5.1 前置条件

- GitHub 账号；
- Cloudflare 账号；
- 已启用 R2；
- Node.js 20+；
- Wrangler；
- 如果使用 Actions，准备一个只授予必要权限的 Cloudflare API Token。

登录 Wrangler：

```powershell
npx wrangler login
```

安装依赖：

```powershell
npm install
```

### 5.2 创建 R2 bucket

可以使用 Cloudflare Dashboard 创建，也可以使用 Wrangler：

```powershell
npx wrangler r2 bucket create private-image-vault
```

没有自定义域名时，可以启用 Cloudflare 管理的 `r2.dev` 公共地址：

```powershell
npx wrangler r2 bucket dev-url enable private-image-vault
```

如果后续拥有自己的域名，更推荐绑定 R2 custom domain，并关闭 `r2.dev` 公共地址。然后把 `PUBLIC_IMAGE_ORIGIN` 换成自定义域名。

### 5.3 替换公开配置中的占位符

公开仓库故意没有携带生产环境名称。需要修改：

- `worker/wrangler.admin.jsonc`
- `worker/wrangler.upload.jsonc`
- `worker/wrangler.bootstrap.jsonc`
- `.env.example` 或部署时的环境变量

至少替换：

```text
YOUR_ADMIN_WORKER.workers.dev
YOUR_UPLOAD_WORKER.workers.dev
YOUR_BUCKET_ID.r2.dev
```

两个 Worker 的 `MEDIA` binding 必须指向同一个 R2 bucket。

### 5.4 部署手机上传 Worker

先部署公开上传端，因为管理端会在生成二维码时使用它的地址：

```powershell
npm run worker:upload:deploy
```

公开 Worker 的根路径返回 404 是设计行为；只有 `/s/<随机令牌>` 才会出现上传页面。

### 5.5 配置管理 Worker secrets

管理 Worker 使用三项 secrets：

```powershell
npx wrangler secret put ACCESS_TEAM_DOMAIN --config worker/wrangler.admin.jsonc
npx wrangler secret put ACCESS_AUD --config worker/wrangler.admin.jsonc
npx wrangler secret put OWNER_EMAILS --config worker/wrangler.admin.jsonc
```

不要把这三项写入仓库、`.env`、前端 JavaScript 或 README。`OWNER_EMAILS` 可以是逗号或换行分隔的 owner 邮箱。

### 5.6 部署管理 Worker

```powershell
npm run worker:deploy
```

管理 Worker 会同时托管 Vite 构建后的静态管理界面，并处理 `/api/*`。如果使用 `npm run build`，确保构建环境中：

```text
VITE_API_MODE=worker
VITE_PUBLIC_IMAGE_ORIGIN=https://YOUR_BUCKET_ID.r2.dev
```

### 5.7 配置 Cloudflare Access

在 Cloudflare One / Zero Trust 的 Access 应用中：

1. 创建 Self-hosted application；
2. 目标选择 Worker；
3. 选择管理 Worker 的 production URL；
4. 创建 Allow policy；
5. Include 使用 owner email；
6. 不要把公开手机上传 Worker 放进这个 Access 应用；
7. 用浏览器打开管理 Worker，确认未登录用户会被拦截，owner 登录后才能看到管理界面和 API。

这里最容易误解的是：没有自定义域名时，不需要先找 Domains & Routes 添加自己的域名。可以直接在 Access 的 Worker destination 中选择 `workers.dev` Worker。

### 5.8 验证

```powershell
npm run worker:typecheck
npm run build
npm run worker:dry-run
npm run worker:upload:dry-run
```

然后完成一次真实流程：管理端生成二维码 → 手机无登录打开 `/s/<token>` → 上传一张图片 → 管理端自动出现 → 停止并关闭 → 原二维码链接返回 410。

## 6. GitHub Actions 自动部署

`.github/workflows/deploy.yml` 会：

1. 安装依赖；
2. 生成 Worker 类型；
3. 类型检查；
4. 构建管理端；
5. 部署公开手机上传 Worker；
6. 部署管理 Worker。

在 GitHub 仓库中配置：

```text
Secrets:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID

Repository variable:
  PUBLIC_IMAGE_ORIGIN
```

API Token 要使用最小权限，不要使用 Cloudflare Global API Key。第一次部署建议先在本地完成，并确认两个 Worker 的 bindings、Access 和 R2 地址无误，再启用 Actions。

## 7. 临时二维码的工作方式

管理端请求：

```text
POST /api/upload-sessions
```

管理 Worker 在 R2 写入：

```text
sessions/<43-character-token>
```

然后返回：

```text
https://YOUR_UPLOAD_WORKER.workers.dev/s/<token>
```

手机端上传时只允许：

```text
POST /api/upload/<token>
```

图片写入：

```text
i/<43-character-asset-token>
```

随机令牌由 Web Crypto `crypto.getRandomValues()` 生成，不使用 `Math.random()`。二维码的令牌是临时上传权限，不是图片本身的访问令牌。关闭会话只删除会话对象和上传标记；图片对象仍由 owner 管理。

## 8. 关键踩坑

### Private repo 不会自动让 Pages 私有

GitHub private source 与 Pages public deployment 是两层不同的权限。需要登录保护的管理端不要直接把“密码锁”写在静态前端里。

### 不能把 GitHub token 写进前端

浏览器端代码、Vite 环境变量中的 `VITE_*` 内容都会进入浏览器。GitHub PAT、Cloudflare API Token、Access secret 必须留在 Worker、GitHub Actions secrets 或 Cloudflare secrets 中。

### Access 不能保护手机上传 Worker

如果把整个管理 Worker 加上 Access，手机扫描二维码后也会被要求登录。因此采用两个 Worker：管理端私有，上传端只接受极难猜的临时 token。

### “随机 URL”不是完整的私有权限系统

随机 URL 可以防止枚举，但不能阻止链接被转发。对敏感文件应使用私有对象和签名 URL，而不是公开 R2 直链。

### 二维码过期不等于图片删除

二维码只是临时上传入口。图片已经写入 R2 后，需要在管理端手动删除或旋转链接。

### `r2.dev` 适合个人和 hobby 使用

没有域名时可以快速上线，但应了解它不是生产级自定义域名/CDN 方案。后续有域名时，可以改用 R2 custom domain。

### 公开 Worker 根路径返回 404 是正常的

这是为了避免访客把公开 Worker 当作可浏览的网站入口。只有管理端生成的完整 `/s/<token>` 地址才有意义。

## 9. 代码结构

```text
src/
  App.jsx                       管理端状态和页面布局
  components/PhoneUploadSheet   二维码管理面板
  lib/api.js                    管理端 API
  lib/i18n.js                   中英文文案

worker/src/index.ts             Access 保护的管理 Worker
worker/src/upload.ts            公开临时手机上传 Worker
worker/src/upload-session.ts    会话、过期和数量限制
worker/wrangler.admin.jsonc     管理 Worker 配置
worker/wrangler.upload.jsonc    上传 Worker 配置
.github/workflows/deploy.yml    双 Worker 自动部署
```

## 10. 生产前检查

- [ ] 已替换所有 `YOUR_*` 占位符；
- [ ] 两个 Worker 使用同一个 R2 bucket；
- [ ] 管理 Worker 已配置 `ACCESS_TEAM_DOMAIN`、`ACCESS_AUD`、`OWNER_EMAILS`；
- [ ] 管理端 Access policy 只允许 owner；
- [ ] 公开上传 Worker 没有 Access；
- [ ] 没有提交 `.env.production`、PAT、API Token、Access JWT 或真实二维码；
- [ ] 已确认图片是允许公开的内容；
- [ ] 已验证关闭二维码后旧链接返回 410；
- [ ] 已验证管理 API 在无登录时不会返回资产数据；
- [ ] 如果是正式生产环境，已考虑自定义域名、私有对象和签名 URL。

## 11. 许可证

代码和文档使用 MIT License。示例图片和截图仅用于演示与测试，使用者应在复刻时替换为自己拥有权利的素材。
