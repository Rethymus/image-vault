# Image Vault — Update Guide

## For humans

Copy one line to your AI implementation Agent:

```text
帮我更新当前工作区的 Image Vault 图片工作站：https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/update.md
```

English:

```text
Update the Image Vault workstation in the current workspace: https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/update.md
```

This is an update instruction, not a request to clone the public repository. The Agent should inspect and update the existing workspace in place.

## For implementation Agents

### Goal

Bring an existing Image Vault implementation into alignment with the current remote contract while preserving the user's real configuration and unrelated changes. Read [`docs/install.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/install.md), [`AGENT_PROMPT.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/AGENT_PROMPT.md), and [`docs/pitfalls.md`](https://raw.githubusercontent.com/Rethymus/image-vault/main/docs/pitfalls.md) only as needed after the initial inspection.

Do not clone this repository, overwrite the workspace wholesale, or assume that a green visual demo means the private Worker is correct.

### Safe update rules

Begin read-only. Do not deploy, change Access, create/delete R2 resources, delete real assets, rotate real links, write secrets, or modify GitHub Actions secrets until the user explicitly approves that exact phase. Never request secrets in chat or place them in source files.

Preserve:

- the existing R2 bucket and its objects;
- owner-selected Worker names and hosts;
- existing `PUBLIC_IMAGE_ORIGIN` and Access values, after verifying them rather than printing them;
- unrelated local changes;
- any user-owned screenshots or documentation assets unless the user asks for a replacement.

### Update checklist

1. Inspect the current branch, package scripts, Worker routes, bindings, environment files, and Git diff.
2. Identify whether the UI is really in Worker mode or has silently fallen back to demo mode.
3. Verify the private list uses R2 as its source of truth, follows every pagination cursor, derives the count from the returned array, and renders all assets.
4. Verify upload, refresh, delete, and rotate use the real API and survive a new page load.
5. Verify public URLs use the approved runtime image origin, not a documentation placeholder.
6. Verify the QR phone Worker remains outside Access and that revoking a session does not pretend to delete an already persisted image.
7. Verify the Pages showcase remains browser-only and clearly marked as non-persistent.
8. Run the guarded Worker build, type checks, Worker dry-runs, and browser acceptance appropriate to the change.
9. Report the files changed, regression checks, missing owner inputs, and any cloud action that still requires approval.

### Required regression guards

The update is incomplete if any of these return:

- an R2 binding exists but the private UI still reads demo seed data;
- a fake `remoteCount`, hard-coded total, or `slice(0, 12)` hides resources;
- duplicate React keys make delete remove the wrong card or only appear to work;
- a production URL contains `img.example.com` or another placeholder;
- the private Worker is built from the Pages demo output;
- `vault-upload` is placed behind the owner-only Access policy;
- a CI environment override reintroduces the wrong image origin after local checks pass.

### Deployment boundary

If the update needs a cloud change, first show the exact target and command, then wait for explicit approval. After approval, use secret storage and perform online acceptance with disposable files. Do not claim that private persistence, deletion, or Access behavior has been verified without authenticated evidence.

