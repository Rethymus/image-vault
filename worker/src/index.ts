import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  SESSION_MAX_FILES,
  SESSION_TTL_MS,
  SESSION_TOKEN_PATTERN,
  newSessionToken,
  removeUploadSession,
  sessionKey,
} from "./upload-session";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

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

function tokenForKey(key: string) {
  const token = key.replace(/^i\//, "");
  return TOKEN_PATTERN.test(token) ? token : null;
}

function publicUrl(env: Env, token: string) {
  return `${env.PUBLIC_IMAGE_ORIGIN.replace(/\/$/, "")}/i/${token}`;
}

function getJwks(teamDomain: string) {
  const cached = jwksCache.get(teamDomain);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(`${teamDomain.replace(/\/$/, "")}/cdn-cgi/access/certs`));
  jwksCache.set(teamDomain, jwks);
  return jwks;
}

async function requireOwner(request: Request, env: Env) {
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.OWNER_EMAILS) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { payload } = await jwtVerify(assertion, getJwks(env.ACCESS_TEAM_DOMAIN), {
      issuer: env.ACCESS_TEAM_DOMAIN.replace(/\/$/, ""),
      audience: env.ACCESS_AUD,
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    const owners = env.OWNER_EMAILS.split(/[;,\n]/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!owners.includes(email)) return new Response("Forbidden", { status: 403 });
    return null;
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}

function toAsset(env: Env, object: R2Object) {
  const token = tokenForKey(object.key);
  if (!token) return null;
  const metadata = object.customMetadata || {};
  const contentType = object.httpMetadata?.contentType || "image/jpeg";
  return {
    id: token,
    name: metadata.originalName || `${token}.${contentType.split("/").at(-1) || "image"}`,
    type: (contentType.split("/").at(-1) || "image").toUpperCase(),
    size: formatBytes(object.size),
    sizeBytes: object.size,
    dimensions: metadata.dimensions || "Unknown dimensions",
    kind: metadata.kind || "Portfolio",
    addedAt: object.uploaded.toISOString().slice(0, 10),
    image: publicUrl(env, token),
    alt: metadata.alt || metadata.originalName || "Image asset",
    url: publicUrl(env, token),
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function listAssets(request: Request, env: Env) {
  const url = new URL(request.url);
  const listed = await env.MEDIA.list({
    prefix: "i/",
    include: ["httpMetadata", "customMetadata"],
    cursor: url.searchParams.get("cursor") || undefined,
    limit: 100,
  });
  return json({
    assets: listed.objects.map((object) => toAsset(env, object)).filter(Boolean),
    nextCursor: listed.truncated ? listed.cursor : null,
  });
}

async function uploadAsset(request: Request, env: Env) {
  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File)) return json({ error: "Missing file" }, { status: 400 });

  const maxBytes = Number(env.MAX_IMAGE_BYTES || 8 * 1024 * 1024);
  if (!ALLOWED_TYPES.has(value.type)) return json({ error: "File type not supported" }, { status: 415 });
  if (value.size > maxBytes) return json({ error: "File is too large" }, { status: 413 });
  if (!(await hasValidSignature(value))) return json({ error: "File signature does not match its type" }, { status: 415 });

  const token = newToken();
  const key = `i/${token}`;
  await env.MEDIA.put(key, value.stream(), {
    httpMetadata: {
      contentType: value.type,
      contentDisposition: "inline",
      cacheControl: "public, max-age=300",
    },
    customMetadata: {
      originalName: String(form.get("originalName") || value.name).slice(0, 180),
      alt: String(form.get("alt") || form.get("originalName") || value.name.replace(/\.[^.]+$/, "")).slice(0, 180),
      kind: "Portfolio",
      cleanMetadata: String(form.get("cleanMetadata") || "false"),
      optimized: String(form.get("optimize") || "false"),
    },
  });

  const object = await env.MEDIA.head(key);
  if (!object) return json({ error: "Uploaded asset could not be read back" }, { status: 500 });
  return json(toAsset(env, object), { status: 201 });
}

async function createUploadSession(env: Env) {
  if (!env.UPLOAD_ORIGIN) return json({ error: "Phone upload is not configured" }, { status: 503 });

  const token = newSessionToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await env.MEDIA.put(sessionKey(token), new Blob(["vault-upload-session"]), {
    customMetadata: {
      expiresAt: String(expiresAt),
      maxFiles: String(SESSION_MAX_FILES),
    },
  });

  return json({
    token,
    uploadUrl: `${env.UPLOAD_ORIGIN.replace(/\/$/, "")}/s/${token}`,
    expiresAt,
    expiresInSeconds: Math.round(SESSION_TTL_MS / 1000),
    maxFiles: SESSION_MAX_FILES,
  }, { status: 201 });
}

async function revokeUploadSession(request: Request, env: Env) {
  const match = new URL(request.url).pathname.match(/^\/api\/upload-sessions\/([A-Za-z0-9_-]{43})\/?$/);
  if (!match || !SESSION_TOKEN_PATTERN.test(match[1])) return json({ error: "Invalid upload session" }, { status: 400 });
  await removeUploadSession(env, match[1]);
  return new Response(null, { status: 204 });
}

function keyFromRequest(request: Request) {
  const path = new URL(request.url).pathname;
  const match = path.match(/^\/api\/assets\/([A-Za-z0-9_-]{43})(?:\/rotate)?$/);
  return match ? `i/${match[1]}` : null;
}

async function deleteAsset(request: Request, env: Env) {
  const key = keyFromRequest(request);
  if (!key) return json({ error: "Invalid asset id" }, { status: 400 });
  const existing = await env.MEDIA.head(key);
  if (!existing) return json({ error: "Asset not found" }, { status: 404 });
  await env.MEDIA.delete(key);
  return new Response(null, { status: 204 });
}

async function rotateAsset(request: Request, env: Env) {
  const key = keyFromRequest(request);
  if (!key) return json({ error: "Invalid asset id" }, { status: 400 });
  const existing = await env.MEDIA.get(key);
  if (!existing?.body) return json({ error: "Asset not found" }, { status: 404 });

  const token = newToken();
  const nextKey = `i/${token}`;
  await env.MEDIA.put(nextKey, existing.body, {
    httpMetadata: existing.httpMetadata,
    customMetadata: existing.customMetadata,
  });
  await env.MEDIA.delete(key);
  const next = await env.MEDIA.head(nextKey);
  if (!next) return json({ error: "Rotated asset could not be read back" }, { status: 500 });
  return json(toAsset(env, next));
}

async function handleApi(request: Request, env: Env) {
  const denied = await requireOwner(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  if (url.pathname === "/api/upload-sessions" && request.method === "POST") return createUploadSession(env);
  if (url.pathname.startsWith("/api/upload-sessions/") && request.method === "DELETE") return revokeUploadSession(request, env);
  if (url.pathname === "/api/assets" && request.method === "GET") return listAssets(request, env);
  if (url.pathname === "/api/assets" && request.method === "POST") return uploadAsset(request, env);
  if (url.pathname.startsWith("/api/assets/") && url.pathname.endsWith("/rotate") && request.method === "POST") return rotateAsset(request, env);
  if (url.pathname.startsWith("/api/assets/") && request.method === "DELETE") return deleteAsset(request, env);
  if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true });
  return json({ error: "Not found" }, { status: 404 });
}

const worker: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (env.ADMIN_HOST && url.hostname !== env.ADMIN_HOST) {
      return new Response("Not found", { status: 404 });
    }
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};

export default worker;
