const imageOrigin = "https://img.example.com";
const assetPath = (fileName) => `${import.meta.env.BASE_URL || "/"}assets/${fileName}`;

export const seededAssets = [
  {
    id: "asset-avatar",
    name: "avatar-portrait.png",
    type: "PNG",
    size: "512 KB",
    sizeBytes: 524288,
    dimensions: "1200 × 1200",
    kind: "Portrait",
    addedAt: "Today",
    image: assetPath("avatar-portrait.png"),
    alt: "Resume portrait",
    url: assetPath("avatar-portrait.png"),
  },
  {
    id: "asset-project",
    name: "mountain-landscape.png",
    type: "PNG",
    size: "1.2 MB",
    sizeBytes: 1258291,
    dimensions: "1600 × 1000",
    kind: "Project",
    addedAt: "Yesterday",
    image: assetPath("mountain-landscape.png"),
    alt: "Alpine mountain landscape",
    url: assetPath("mountain-landscape.png"),
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
    image: assetPath("readme-setup.png"),
    alt: "Developer desk with a code monitor",
    url: assetPath("readme-setup.png"),
  },
  {
    id: "asset-architecture",
    name: "dashboard-dark.png",
    type: "PNG",
    size: "1.4 MB",
    sizeBytes: 1468006,
    dimensions: "1600 × 1067",
    kind: "Portfolio",
    addedAt: "Aug 17",
    image: assetPath("project-dashboard.png"),
    alt: "Dark project dashboard",
    url: assetPath("project-dashboard.png"),
  },
  {
    id: "asset-architecture",
    name: "architecture.png",
    type: "PNG",
    size: "1.4 MB",
    sizeBytes: 1468006,
    dimensions: "1600 × 1067",
    kind: "Portfolio",
    addedAt: "Aug 15",
    image: assetPath("architecture.png"),
    alt: "Modern concrete and glass architecture",
    url: assetPath("architecture.png"),
  },
  {
    id: "asset-product",
    name: "backpack-product.png",
    type: "PNG",
    size: "1.5 MB",
    sizeBytes: 1572864,
    dimensions: "1600 × 1067",
    kind: "Portfolio",
    addedAt: "Aug 12",
    image: assetPath("backpack-product.png"),
    alt: "Minimal charcoal backpack product shot",
    url: assetPath("backpack-product.png"),
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
    url: origin ? `${origin}/i/${token}` : image,
    local: true,
  };
}
