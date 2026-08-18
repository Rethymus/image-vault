# Cloudflare Private Image Vault

一个可以直接交给 Agent 复刻的个人图片链接管理方案：Cloudflare Worker + R2 + Cloudflare Access + 临时二维码手机上传。

This repository is a reproducible personal image-link manager built with Cloudflare Workers, R2, Cloudflare Access, and temporary QR-code uploads from a phone.

## 文档 / Documentation

- [中文完整说明](README.zh-CN.md)
- [English guide](README.en.md)
- [面向 Agent 的复刻清单 / Agent reproduction checklist](docs/agent-reproduction.md)
- [架构与安全边界 / Architecture and security boundaries](docs/architecture.md)
- [踩坑记录 / Lessons learned](docs/troubleshooting.md)
- [安全说明 / Security](SECURITY.md)

## 这是什么 / What this is

这是一个小型、owner-only 的图片管理器。管理端受 Cloudflare Access 保护；图片本身通过不可枚举的随机 URL 公开展示；管理端可以生成一个只允许临时上传的二维码，让手机无需登录即可上传几张图片。

The admin manager is protected by Cloudflare Access. Images are displayed through unguessable public-by-link URLs. The owner can create a short-lived QR channel so a phone can upload a few images without signing in.

## 快速预览 / Quick preview

中文界面：

![中文二维码上传界面](docs/assets/screenshots/zh/qr-phone-upload.png)

![中文手机上传完成](docs/assets/screenshots/zh/phone-upload-success.png)

English interface:

![English QR upload interface](docs/assets/screenshots/en/qr-phone-upload.png)

![English phone upload complete](docs/assets/screenshots/en/phone-upload-success.png)

README 中的二维码是一个安全的演示彩蛋，不是生产环境上传通道。请不要把生产二维码、Access 凭据、R2 密钥或个人图片提交到公开仓库。

The QR codes shown in the README are safe demonstration easter eggs, not production upload channels. Never commit a production QR token, Access credential, R2 secret, or personal image to a public repository.

## 方案摘要 / Architecture summary

```text
Private GitHub repository
        │ GitHub Actions or manual Wrangler deploy
        ▼
Admin Worker + Static Assets ── Cloudflare Access ── owner only
        │
        ├── create/revoke temporary upload sessions
        ├── list/delete/rotate image links
        └── poll for phone uploads while the QR sheet is open

Public Upload Worker ── tokenized /s/<session-token> only
        │
        └── JPG/PNG/WebP, 8 MB each, 10 minutes, up to 5 files
                         │
                         ▼
                         R2 bucket
                         │
                         └── public-by-link /i/<random-asset-token>
```

## 选择当前方案还是 GitHub Pages 方案？ / Which approach should you choose?

| 场景 | 建议 |
| --- | --- |
| 个人偶尔上传展示图、头像、README 配图，并希望浏览器直接上传 | 使用本仓库的 Worker + R2 方案 |
| 图片需要由 Git 提交版本化，上传频率低，不需要运行时管理后台 | GitHub private repo + GitHub Pages 足够 |
| 文件是证件、合同、护照、简历原件等必须保密的内容 | 不要使用公开图片直链；改用私有 R2 + 短期签名 URL 或受保护的下载 Worker |
| 多用户、审计、配额、评论、团队协作 | 在本方案上增加数据库、身份系统和更严格的访问层，或选择专门的对象存储产品 |

完整的方案演进、优缺点和踩坑记录请阅读中文或英文完整说明。

Read the full Chinese or English guide for the original GitHub Pages idea, the reasons for moving to Workers + R2, trade-offs, deployment steps, and lessons learned.

## License

The implementation and documentation are released under the MIT License. See [LICENSE](LICENSE). The demo images and screenshots are included for documentation and testing; replace them before using this repository for real personal data.
