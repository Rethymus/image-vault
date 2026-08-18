const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const apiMode = import.meta.env.VITE_API_MODE || "demo";

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

export async function listRemoteAssets() {
  const payload = await request("/api/assets");
  return payload.assets || [];
}

export async function uploadRemoteAsset(file, options = {}) {
  const form = new FormData();
  form.set("file", file);
  form.set("cleanMetadata", String(Boolean(options.cleanMetadata)));
  form.set("optimize", String(Boolean(options.optimize)));
  form.set("alt", options.alt || file.name.replace(/\.[^.]+$/, ""));
  form.set("originalName", options.originalName || file.name);

  return request("/api/assets", {
    method: "POST",
    body: form,
  });
}

export async function deleteRemoteAsset(assetId) {
  await request(`/api/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
}

export async function rotateRemoteAsset(assetId) {
  return request(`/api/assets/${encodeURIComponent(assetId)}/rotate`, { method: "POST" });
}

export async function createRemoteUploadSession() {
  return request("/api/upload-sessions", { method: "POST" });
}

export async function revokeRemoteUploadSession(token) {
  await request(`/api/upload-sessions/${encodeURIComponent(token)}`, { method: "DELETE" });
}
