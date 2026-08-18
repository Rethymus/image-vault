const imageOrigin = "https://img.example.com";

export const seededAssets = [
  {
    id: "asset-avatar",
    name: "avatar-portrait.jpg",
    type: "JPG",
    size: "512 KB",
    sizeBytes: 524288,
    dimensions: "1200 × 1200",
    kind: "Portrait",
    addedAt: "Today",
    image: "/assets/avatar-portrait.png",
    alt: "Resume portrait",
    url: `${imageOrigin}/i/T4JvPr8A5jKYpmQOjwhP7f2pdaNbQy-Xj5T8mBap3xA`,
  },
  {
    id: "asset-project",
    name: "project-dashboard.png",
    type: "PNG",
    size: "1.2 MB",
    sizeBytes: 1258291,
    dimensions: "1600 × 1000",
    kind: "Project",
    addedAt: "Yesterday",
    image: "/assets/project-dashboard.png",
    alt: "Project dashboard screenshot",
    url: `${imageOrigin}/i/N1l9TwdveofrVvw0KAcg87wrtdLnmaCO8YOwuMU-4rM`,
  },
  {
    id: "asset-readme",
    name: "readme-setup.png",
    type: "PNG",
    size: "876 KB",
    sizeBytes: 897024,
    dimensions: "1600 × 1067",
    kind: "README",
    addedAt: "Yesterday",
    image: "/assets/readme-setup.png",
    alt: "Developer desk with a code monitor",
    url: `${imageOrigin}/i/H7Cdva-D0YNDFWOXm4Xi9OmX7KZM-Mm8NwQaWrOSZ4E`,
  },
  {
    id: "asset-architecture",
    name: "architecture.jpg",
    type: "JPG",
    size: "1.4 MB",
    sizeBytes: 1468006,
    dimensions: "1600 × 1067",
    kind: "Portfolio",
    addedAt: "Aug 17",
    image: "/assets/architecture.png",
    alt: "Modern concrete and glass architecture",
    url: `${imageOrigin}/i/Q0MZ8WcKf6xC0Y4j7qG5LJtZsYp8y7XKx2D2c9f4b1A`,
  },
  {
    id: "asset-portrait",
    name: "profile-card.jpg",
    type: "JPG",
    size: "742 KB",
    sizeBytes: 759808,
    dimensions: "1400 × 1050",
    kind: "Portfolio",
    addedAt: "Aug 15",
    image: "/assets/avatar-portrait.png",
    alt: "Portrait image for a profile card",
    url: `${imageOrigin}/i/9xR8jL3kTq4vBnM0eZ5pYs2aW7uHg1dF6cK8nQ0rV2s`,
  },
  {
    id: "asset-workspace",
    name: "workspace-detail.png",
    type: "PNG",
    size: "1.1 MB",
    sizeBytes: 1153434,
    dimensions: "1600 × 1067",
    kind: "README",
    addedAt: "Aug 12",
    image: "/assets/readme-setup.png",
    alt: "Minimal developer workspace",
    url: `${imageOrigin}/i/c6WmJtZ0uH2aP9sX4nQ8rL1vB5dF7kG3yE6pM0xV2zA`,
  },
];

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createToken() {
  const bytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function inferKind(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("avatar") || normalized.includes("portrait")) return "Portrait";
  if (normalized.includes("readme") || normalized.includes("setup")) return "README";
  if (normalized.includes("project") || normalized.includes("dashboard")) return "Project";
  return "Portfolio";
}

export function createLocalAsset(file, image, origin = imageOrigin, displayName = file.name) {
  const token = createToken();
  return {
    id: `asset-${token}`,
    name: displayName,
    type: file.type.split("/").at(-1)?.toUpperCase() || "IMAGE",
    size: formatBytes(file.size),
    sizeBytes: file.size,
    dimensions: "Local preview",
    kind: inferKind(file.name),
    addedAt: "Just now",
    image,
    alt: file.name.replace(/\.[^.]+$/, ""),
    url: `${origin}/i/${token}`,
    local: true,
  };
}
