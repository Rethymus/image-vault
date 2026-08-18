# GitHub Pages 效果展示 / GitHub Pages showcase

在线入口 / Live entry point: <https://rethymus.github.io/image-vault/>

本页是公开仓库提供的可复现演示部署。它用 GitHub Pages 展示完整的 Vault 工作站界面、六张概念图、浅色/深色模式、中英切换和二维码手机上传流程；它不是生产图片托管服务，也不连接当前 Cloudflare 的 Worker、R2 或 Access。

This page is the reproducible public showcase for the repository. It demonstrates the full Vault workstation, all six concept-card images, light/dark appearance, Chinese/English switching, and the QR phone-upload flow on GitHub Pages. It is not the production image host and does not connect to the Cloudflare Worker, R2, or Access environment.

## 演示页能做什么 / What the showcase can do

- 展示概念图中的六张独立样例图，并通过 `public/assets/` 以 Pages 静态资源方式加载；
- 选择、拖拽和预览 JPG、PNG、WebP 文件；
- 在当前浏览器内模拟上传进度、复制、删除、链接轮换和详情面板；
- 使用系统、浅色、深色三种外观选择，并在中文/英文之间切换；
- 点击“手机上传”生成 10 分钟有效的演示二维码；
- 用手机或另一浏览器打开二维码地址，选择最多 3 张图片，完成一次移动端上传演示；
- 在手机上传页直接显示“无持久化”提示，避免把演示流程误认为生产通道。

- Shows six independent sample images from the concept board, loaded as static Pages assets from `public/assets/`;
- Accepts and previews JPG, PNG, and WebP files through file selection or drag-and-drop;
- Simulates upload progress, copy, delete, URL rotation, and detail states in the current browser;
- Supports system, light, and dark appearance plus Chinese/English switching;
- Generates a 10-minute demo QR code from the “Phone upload” action;
- Opens a mobile upload page from the QR URL and accepts up to three files for the interaction demo;
- Places the no-persistence warning directly in the mobile flow so the demo is not mistaken for production.

## 明确不能做什么 / What it deliberately does not do

GitHub Pages 只能发布静态文件。因此这个演示页不会：

1. 把浏览器选中的文件上传到 R2、Worker、GitHub 或任何远端数据库；
2. 把手机上传的文件传回正在打开桌面页的另一台设备；
3. 在刷新、关闭页面或换设备后保留演示资源；
4. 为演示上传生成真实可撤销的生产 bearer URL；
5. 提供 Cloudflare Access、owner 身份认证、真实删除或真实 URL 轮换。

The static Pages build therefore does not:

1. send selected files to R2, a Worker, GitHub, or a remote database;
2. transfer phone uploads back to a desktop page on another device;
3. retain demo assets after refresh, close, or device changes;
4. issue a real revocable production bearer URL for demo uploads;
5. provide Cloudflare Access, owner authentication, real deletion, or real URL rotation.

演示上传只存在于当前页面的内存和 `blob:` 预览 URL 中。不要上传真实身份证、护照、证件照原件、未公开简历、合同、医疗或财务文件；这个页面是公开的，任何人都能访问。

Demo uploads exist only in the current page memory and temporary `blob:` preview URLs. Do not upload an actual identity document, passport, original ID photo, unreleased résumé, contract, medical record, or financial file. This page is public and anyone can access it.

## 概念图资源对照 / Concept asset mapping

| 概念卡片 / Concept card | Pages 文件 / Pages file | 展示用途 / Use |
| --- | --- | --- |
| avatar-portrait | `public/assets/avatar-portrait.png` | 简历头像 / résumé portrait |
| mountain-landscape | `public/assets/mountain-landscape.png` | 项目展示图 / project showcase |
| readme-setup | `public/assets/readme-setup.png` | README 配图 / README asset |
| dashboard-dark | `public/assets/project-dashboard.png` | 深色项目面板 / dark project dashboard |
| architecture | `public/assets/architecture.png` | 作品集图片 / portfolio image |
| product-shot | `public/assets/backpack-product.png` | 产品展示图 / product showcase |

六张图都随公开仓库发布，不依赖 R2 或外部图片地址。这样即使 Cloudflare 环境没有配置，Pages 截图和演示仍能完整渲染。

All six images ship with the public repository and do not depend on R2 or an external image origin. The Pages screenshot and interaction demo therefore remain complete even when Cloudflare is not configured.

## 部署方式 / Deployment

`.github/workflows/pages.yml` 使用 GitHub 官方 Pages artifact 部署流程：

1. 在 `main` 发生前端、静态资源或 Pages workflow 变更时触发；
2. 使用 Node.js 22 和 `npm ci` 安装依赖；
3. 以 `VITE_API_MODE=demo` 构建浏览器演示；
4. 以 `VITE_BASE_PATH=/image-vault/` 确保项目站点路径下的资源地址正确；
5. 上传 `dist/` artifact 并部署到 GitHub Pages。

The workflow uses GitHub's official Pages artifact deployment flow. It builds with `VITE_API_MODE=demo` and `VITE_BASE_PATH=/image-vault/`, so the static image paths, favicon, QR URL, and navigation work under the repository Pages path rather than assuming a custom domain.

首次启用时，在仓库 `Settings → Pages` 中将构建来源设为 `GitHub Actions`；之后 push 到 `main` 或手动运行 `Deploy GitHub Pages showcase` 即可重新发布。

For the first enablement, set `Settings → Pages` to use `GitHub Actions` as the source. Later pushes to `main` or a manual run of `Deploy GitHub Pages showcase` publish a new showcase build.

## 验收清单 / Acceptance checklist

- [ ] Pages 首页显示 `GitHub Pages 演示` / `GitHub Pages demo` 标识；
- [ ] 六张样例图片都能加载，不出现破图；
- [ ] 切换中文、英文后，桌面端和手机端文案都同步；
- [ ] 浅色、深色和系统外观都能切换；
- [ ] “手机上传”能生成二维码和可复制 URL；
- [ ] 二维码 URL 能打开移动端上传页；
- [ ] 移动端选择图片后能显示预览、数量、限制和完成状态；
- [ ] 页面明确提示刷新/关闭后不会持久化；
- [ ] 没有把真实 Cloudflare secret、生产 QR token 或个人文件提交到公开仓库。

The expected flow is: Pages demo loads → six sample cards render → demo QR opens the mobile page → local phone upload completes → the page explains that no data was persisted.
