import {
  SESSION_MAX_FILES,
  SESSION_TOKEN_PATTERN,
  countSessionUploads,
  newSessionToken,
  readUploadSession,
  sessionTokenFromPath,
  sessionUploadsPrefix,
  uploadTokenFromPath,
} from "./upload-session";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function pageHeaders() {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  };
}

function publicUrl(env: Env, token: string) {
  return `${env.PUBLIC_IMAGE_ORIGIN.replace(/\/$/, "")}/i/${token}`;
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

function uploadPage(token: string, expiresAt: number) {
  const tokenLiteral = JSON.stringify(token);
  const expiresLiteral = String(expiresAt);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f5f5f7" />
    <title>Upload from your phone · Vault</title>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
        --page: #f5f5f7;
        --surface: rgba(255, 255, 255, 0.76);
        --surface-solid: #ffffff;
        --text: #1d1d1f;
        --muted: #6e6e73;
        --faint: #86868b;
        --line: rgba(0, 0, 0, 0.1);
        --accent: #0071e3;
        --accent-soft: rgba(0, 113, 227, 0.11);
        --success: #34c759;
        --danger: #ff3b30;
        --shadow: 0 18px 56px rgba(31, 33, 41, 0.12), 0 1px 2px rgba(31, 33, 41, 0.05);
      }
      :root[data-theme="dark"] {
        color-scheme: dark;
        --page: #000000;
        --surface: rgba(28, 28, 30, 0.8);
        --surface-solid: #1c1c1e;
        --text: #f5f5f7;
        --muted: #98989d;
        --faint: #8e8e93;
        --line: rgba(255, 255, 255, 0.14);
        --accent: #2997ff;
        --accent-soft: rgba(41, 151, 255, 0.17);
        --success: #30d158;
        --danger: #ff453a;
        --shadow: 0 24px 70px rgba(0, 0, 0, 0.48), 0 1px 4px rgba(0, 0, 0, 0.3);
      }
      * { box-sizing: border-box; }
      html { min-width: 320px; background: var(--page); }
      body { min-width: 320px; min-height: 100vh; margin: 0; color: var(--text); background: var(--page); }
      body::before { position: fixed; z-index: -1; inset: 0; content: ""; pointer-events: none; background: radial-gradient(circle at 50% -10%, var(--accent-soft), transparent 40%); opacity: .7; }
      button, input { font: inherit; }
      button { -webkit-tap-highlight-color: transparent; }
      .page { display: grid; min-height: 100vh; place-items: center; padding: 24px 16px; }
      .panel { width: min(100%, 480px); padding: 24px; border: 1px solid var(--line); border-radius: 28px; background: var(--surface); box-shadow: var(--shadow); -webkit-backdrop-filter: blur(28px) saturate(1.4); backdrop-filter: blur(28px) saturate(1.4); }
      .brand { display: flex; align-items: center; justify-content: space-between; margin-bottom: 34px; }
      .brand strong { font-size: 22px; letter-spacing: -.045em; }
      .brand span { color: var(--faint); font-size: 12px; }
      h1 { margin: 0; font-size: clamp(32px, 9vw, 46px); letter-spacing: -.065em; line-height: 1; }
      .subtitle { margin: 11px 0 26px; color: var(--muted); font-size: 15px; line-height: 1.5; }
      .drop { display: grid; min-height: 210px; place-items: center; align-content: center; gap: 10px; padding: 22px; border: 1.5px dashed var(--line); border-radius: 21px; background: rgba(255, 255, 255, .3); text-align: center; }
      :root[data-theme="dark"] .drop { background: rgba(255, 255, 255, .035); }
      .drop.is-ready { border-color: var(--accent); background: var(--accent-soft); }
      .drop-icon { display: grid; width: 58px; height: 58px; place-items: center; color: var(--accent); border-radius: 18px; background: var(--accent-soft); }
      .drop-icon svg { width: 30px; height: 30px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
      .drop strong { font-size: 17px; }
      .drop span { color: var(--muted); font-size: 13px; line-height: 1.45; }
      .choose { min-height: 44px; margin-top: 4px; padding: 0 18px; color: #fff; border: 0; border-radius: 13px; background: var(--accent); box-shadow: 0 7px 18px rgba(0, 113, 227, .22); cursor: pointer; font-size: 14px; font-weight: 650; }
      .choose:disabled { cursor: not-allowed; opacity: .45; }
      .upload-action { width: 100%; margin-top: 14px; }
      input[type=file] { display: none; }
      .expire { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; margin-top: 17px; color: var(--muted); font-size: 13px; text-align: center; }
      .expire-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px rgba(52, 199, 89, .13); }
      .file-list { display: grid; gap: 8px; margin-top: 17px; }
      .file-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface-solid); font-size: 13px; }
      .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .file-status { flex: 0 0 auto; color: var(--muted); font-size: 12px; }
      .file-status.done { color: var(--success); }
      .file-status.error { color: var(--danger); }
      .message { min-height: 20px; margin-top: 16px; color: var(--muted); font-size: 13px; line-height: 1.45; text-align: center; }
      .message.error { color: var(--danger); }
      .message.success { color: var(--success); }
      .footer { margin-top: 25px; color: var(--faint); font-size: 11px; line-height: 1.5; text-align: center; }
      .expired { text-align: center; }
      .expired-mark { display: grid; width: 54px; height: 54px; place-items: center; margin: 0 auto 18px; color: var(--muted); border-radius: 17px; background: rgba(134, 134, 139, .13); }
      .expired p { margin: 12px auto 0; max-width: 320px; color: var(--muted); font-size: 14px; line-height: 1.55; }
      @media (max-width: 480px) { .page { align-items: start; padding: 12px; } .panel { min-height: calc(100vh - 24px); padding: 21px; border-radius: 25px; } .brand { margin-bottom: 54px; } .drop { min-height: 240px; } }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; } }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="panel" id="app" aria-live="polite">
        <div class="brand"><strong>Vault</strong><span id="subtitle-label">Temporary private channel</span></div>
        <h1 id="title">Upload from your phone</h1>
        <p class="subtitle" id="description">Choose photos or images to add to the private vault.</p>
        <form id="upload-form">
          <label class="drop" id="drop-zone" for="file-input">
            <span class="drop-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 15v4h14v-4"/></svg></span>
            <strong id="choose-label">Choose files</strong>
            <span id="drop-label">JPG, PNG, and WebP up to 8 MB each.</span>
            <button class="choose" id="choose-button" type="button">Choose files</button>
            <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          </label>
          <div class="file-list" id="file-list"></div>
          <button class="choose upload-action" id="upload-button" type="submit" disabled>Upload</button>
          <div class="expire"><span class="expire-dot" id="expire-dot"></span><span id="expire-label"></span></div>
          <div class="message" id="message"></div>
        </form>
        <p class="footer" id="footer-label">This link is temporary. The Vault owner can stop it at any time.</p>
      </section>
    </main>
    <script>
      (() => {
        const TOKEN = ${tokenLiteral};
        const EXPIRES_AT = ${expiresLiteral};
        const MAX_BYTES = 8 * 1024 * 1024;
        const COPY = {
          en: {
            subtitle: "Temporary private channel", title: "Upload from your phone", description: "Choose photos or images to add to the private vault.", choose: "Choose files", upload: "Upload", note: "JPG, PNG, and WebP up to 8 MB each.", expires: "This channel expires in", expired: "This upload channel has expired.", footer: "This link is temporary. The Vault owner can stop it at any time.", uploading: "Uploading…", uploaded: "Uploaded", failed: "Upload failed", success: "Upload complete", typeError: "Only JPG, PNG, and WebP files are supported.", sizeError: "That image is over the 8 MB limit.", genericError: "Something went wrong. Please try again.", count: " images selected"
          },
          zh: {
            subtitle: "临时私有通道", title: "从手机上传", description: "选择要添加到私有 Vault 的照片或图片。", choose: "选择文件", upload: "上传", note: "支持 JPG、PNG 和 WebP · 每张不超过 8 MB。", expires: "此通道将在", expired: "此上传通道已失效。", footer: "这是一个临时链接，Vault 所有者可以随时停止它。", uploading: "上传中…", uploaded: "上传成功", failed: "上传失败", success: "上传完成", typeError: "仅支持 JPG、PNG 和 WebP 文件。", sizeError: "这张图片超过了 8 MB 限制。", genericError: "出现了一些问题，请再试一次。", count: " 张图片已选择"
          }
        };
        const language = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
        const copy = COPY[language];
        document.documentElement.lang = language;
        document.title = copy.title + " · Vault";
        document.querySelector("#subtitle-label").textContent = copy.subtitle;
        document.querySelector("#title").textContent = copy.title;
        document.querySelector("#description").textContent = copy.description;
        document.querySelector("#choose-label").textContent = copy.choose;
        document.querySelector("#choose-button").textContent = copy.choose;
        document.querySelector("#drop-label").textContent = copy.note;
        document.querySelector("#footer-label").textContent = copy.footer;

        const form = document.querySelector("#upload-form");
        const input = document.querySelector("#file-input");
        const dropZone = document.querySelector("#drop-zone");
        const fileList = document.querySelector("#file-list");
        const message = document.querySelector("#message");
        const expireLabel = document.querySelector("#expire-label");
        const expireDot = document.querySelector("#expire-dot");
        const uploadButton = document.querySelector("#upload-button");
        let selectedFiles = [];
        let isUploading = false;

        function formatRemaining(seconds) {
          const minutes = Math.floor(seconds / 60);
          const rest = seconds % 60;
          return minutes + ":" + String(rest).padStart(2, "0");
        }

        function updateExpiry() {
          const remaining = Math.max(0, Math.floor((EXPIRES_AT - Date.now()) / 1000));
          if (!remaining) {
            expireDot.style.background = "var(--danger)";
            expireLabel.textContent = copy.expired;
            input.disabled = true;
            uploadButton.disabled = true;
            dropZone.classList.remove("is-ready");
            return;
          }
          expireLabel.textContent = copy.expires + " " + formatRemaining(remaining);
        }

        function setMessage(text, tone) {
          message.textContent = text || "";
          message.className = "message" + (tone ? " " + tone : "");
        }

        function renderFiles() {
          fileList.innerHTML = "";
          selectedFiles.forEach((file, index) => {
            const row = document.createElement("div");
            row.className = "file-row";
            row.innerHTML = '<span class="file-name"></span><span class="file-status" data-status="' + index + '"></span>';
            row.querySelector(".file-name").textContent = file.name;
            row.querySelector("[data-status]").textContent = file.size ? Math.ceil(file.size / 1024) + " KB" : "";
            fileList.appendChild(row);
          });
          dropZone.classList.toggle("is-ready", selectedFiles.length > 0);
        }

        input.addEventListener("change", () => {
          selectedFiles = Array.from(input.files || []);
          renderFiles();
          uploadButton.disabled = selectedFiles.length === 0;
          uploadButton.textContent = selectedFiles.length ? copy.upload + " (" + selectedFiles.length + ")" : copy.upload;
          setMessage(selectedFiles.length ? selectedFiles.length + copy.count : "", "");
        });
        ["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add("is-ready"); }));
        ["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); if (eventName === "drop") { selectedFiles = Array.from(event.dataTransfer.files || []); renderFiles(); } }));

        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (isUploading || !selectedFiles.length) return;
          isUploading = true;
          uploadButton.disabled = true;
          uploadButton.textContent = copy.uploading;
          setMessage("", "");
          const rows = Array.from(fileList.querySelectorAll(".file-row"));
          let completed = 0;
          for (let index = 0; index < selectedFiles.length; index += 1) {
            const file = selectedFiles[index];
            const status = rows[index]?.querySelector("[data-status]");
            try {
              if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(copy.typeError);
              if (file.size > MAX_BYTES) throw new Error(copy.sizeError);
              if (status) status.textContent = copy.uploading;
              const data = new FormData();
              data.set("file", file, file.name);
              const response = await fetch("/api/upload/" + TOKEN, { method: "POST", body: data });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(payload.error || copy.genericError);
              if (status) { status.textContent = copy.uploaded; status.className = "file-status done"; }
              completed += 1;
            } catch (error) {
              if (status) { status.textContent = copy.failed; status.className = "file-status error"; }
              setMessage(error instanceof Error ? error.message : copy.genericError, "error");
            }
          }
          isUploading = false;
          if (completed && completed === selectedFiles.length) setMessage(copy.success, "success");
          selectedFiles = [];
          input.value = "";
          uploadButton.textContent = copy.upload;
          renderFiles();
        });

        updateExpiry();
        window.setInterval(updateExpiry, 1000);
      })();
    </script>
  </body>
</html>`;
}

function expiredPage() {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#f5f5f7" /><title>Upload link expired · Vault</title>
    <style>body{display:grid;min-height:100vh;place-items:center;margin:0;padding:20px;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.panel{width:min(100%,420px);padding:34px 26px;border:1px solid rgba(0,0,0,.1);border-radius:24px;background:rgba(255,255,255,.78);box-shadow:0 18px 56px rgba(31,33,41,.12);text-align:center}.mark{display:grid;width:54px;height:54px;place-items:center;margin:0 auto 18px;border-radius:17px;background:rgba(134,134,139,.13);color:#6e6e73;font-size:24px}.panel h1{margin:0;font-size:27px;letter-spacing:-.04em}.panel p{margin:12px auto 0;max-width:320px;color:#6e6e73;font-size:14px;line-height:1.55}</style>
  </head>
  <body><section class="panel"><div class="mark">⌁</div><h1>This upload link has expired</h1><p>Ask the Vault owner to generate a new QR code.</p></section></body>
</html>`;
}

async function uploadFromPhone(request: Request, env: Env, token: string) {
  const session = await readUploadSession(env, token);
  if (!session) return json({ error: "This upload channel has expired" }, { status: 410 });

  const currentCount = await countSessionUploads(env, token, session.maxFiles + 1);
  if (currentCount >= Math.min(session.maxFiles, SESSION_MAX_FILES)) {
    return json({ error: "This upload channel has reached its image limit" }, { status: 429 });
  }

  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File)) return json({ error: "Missing file" }, { status: 400 });

  const maxBytes = Number(env.MAX_IMAGE_BYTES || 8 * 1024 * 1024);
  if (!ALLOWED_TYPES.has(value.type)) return json({ error: "Only JPG, PNG, and WebP files are supported" }, { status: 415 });
  if (value.size > maxBytes) return json({ error: "That image is over the 8 MB limit" }, { status: 413 });
  if (!(await hasValidSignature(value))) return json({ error: "File signature does not match its type" }, { status: 415 });

  const assetToken = newSessionToken();
  const originalName = String(value.name || "phone-upload").slice(0, 180);
  await env.MEDIA.put(`i/${assetToken}`, value.stream(), {
    httpMetadata: {
      contentType: value.type,
      contentDisposition: "inline",
      cacheControl: "public, max-age=300",
    },
    customMetadata: {
      originalName,
      alt: originalName.replace(/\.[^.]+$/, ""),
      kind: "Phone upload",
      uploadedVia: "temporary-qr",
    },
  });
  await env.MEDIA.put(`${sessionUploadsPrefix(token)}${assetToken}`, new Blob(["uploaded"]));

  return json({
    ok: true,
    name: originalName,
    url: publicUrl(env, assetToken),
  }, { status: 201 });
}

const worker: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pageToken = sessionTokenFromPath(url.pathname);
    if (pageToken && request.method === "GET") {
      const session = await readUploadSession(env, pageToken);
      return new Response(session ? uploadPage(pageToken, session.expiresAt) : expiredPage(), {
        status: session ? 200 : 410,
        headers: pageHeaders(),
      });
    }

    const uploadToken = uploadTokenFromPath(url.pathname);
    if (uploadToken && request.method === "POST") return uploadFromPhone(request, env, uploadToken);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/s/")) return json({ error: "Not found" }, { status: 404 });
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  },
};

export default worker;
