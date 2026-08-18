export const SESSION_TTL_MS = 10 * 60 * 1000;
export const SESSION_MAX_FILES = 5;
export const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function sessionKey(token: string) {
  return `sessions/${token}`;
}

export function sessionUploadsPrefix(token: string) {
  return `${sessionKey(token)}/uploads/`;
}

export function sessionTokenFromPath(pathname: string) {
  const match = pathname.match(/^\/s\/([A-Za-z0-9_-]{43})\/?$/);
  return match?.[1] || null;
}

export function uploadTokenFromPath(pathname: string) {
  const match = pathname.match(/^\/api\/upload\/([A-Za-z0-9_-]{43})\/?$/);
  return match?.[1] || null;
}

export function newSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function readUploadSession(env: Env, token: string) {
  if (!SESSION_TOKEN_PATTERN.test(token)) return null;
  const object = await env.MEDIA.head(sessionKey(token));
  if (!object) return null;

  const metadata = object.customMetadata || {};
  const expiresAt = Number(metadata.expiresAt);
  const maxFiles = Number(metadata.maxFiles) || SESSION_MAX_FILES;
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    await env.MEDIA.delete(sessionKey(token));
    return null;
  }

  return {
    token,
    expiresAt,
    maxFiles: Math.min(Math.max(1, maxFiles), SESSION_MAX_FILES),
  };
}

export async function countSessionUploads(env: Env, token: string, limit = SESSION_MAX_FILES + 1) {
  const listed = await env.MEDIA.list({
    prefix: sessionUploadsPrefix(token),
    limit,
  });
  return listed.objects.length;
}

export async function removeUploadSession(env: Env, token: string) {
  let cursor: string | undefined;
  do {
    const listed = await env.MEDIA.list({
      prefix: sessionKey(token),
      cursor,
      limit: 1000,
    });
    if (listed.objects.length) await env.MEDIA.delete(listed.objects.map((object) => object.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
