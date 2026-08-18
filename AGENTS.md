# Agent instructions

This repository is intentionally designed to be handed to an implementation agent for a one-to-one reproduction of the deployment flow.

## Operating rules

1. Read `README.md`, the language-specific README, and `docs/agent-reproduction.md` before changing code or deploying anything.
2. Treat every value beginning with `YOUR_` as a required user-owned configuration value. Do not invent a production domain, bucket ID, account ID, Access audience, or email allowlist.
3. Never ask the user to paste a Cloudflare API token, PAT, Access JWT, or other secret into a source file or chat message. Use Wrangler secrets, GitHub Actions secrets, or the user's own terminal session.
4. Do not deploy, delete an R2 bucket, delete user assets, or change an Access policy unless the user explicitly asks for that exact action.
5. Keep the admin Worker and public phone upload Worker separate. Do not put the public upload Worker behind the owner-only Access application.
6. Preserve the security model: admin API checks Access JWT claims; the public Worker accepts only a 43-character random session token; the public Worker has no list, delete, or admin routes.
7. Treat image URLs as bearer capabilities. Do not describe this project as a private document vault.
8. Before deployment, run the type check, build, and both Wrangler dry runs. After deployment, test the QR upload, revocation, unauthenticated admin API, public root, and exact image URL behavior.
9. Never commit `.env.production`, `.env`, `node_modules`, `.wrangler`, live QR tokens, Access credentials, or real personal assets.

## Preferred reproduction order

```text
read docs
  → replace placeholders
  → create R2 bucket
  → enable r2.dev or configure a custom R2 domain
  → deploy public upload Worker
  → configure admin secrets
  → deploy admin Worker
  → configure Cloudflare Access for admin Worker only
  → test QR upload and revocation
  → optionally enable GitHub Actions
```

If a requested change would weaken this model, explain the trade-off before implementing it.
