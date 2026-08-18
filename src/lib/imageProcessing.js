function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    image.src = url;
  });
}

async function decodeImage(file) {
  if (globalThis.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the image element path for older browser implementations.
    }
  }
  return loadImage(file);
}

function blobToFile(blob, file) {
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${baseName}.${extension}`, {
    type: blob.type,
    lastModified: file.lastModified,
  });
}

export async function prepareImage(file, { cleanMetadata, optimize }) {
  if (!cleanMetadata && !optimize) return file;

  try {
    const image = await decodeImage(file);
    const sourceWidth = image.width;
    const sourceHeight = image.height;
    const longestSide = Math.max(sourceWidth, sourceHeight);
    const scale = optimize ? Math.min(1, 2400 / longestSide) : 1;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);
    if (typeof image.close === "function") image.close();

    const outputType = file.type === "image/png" ? "image/png" : "image/webp";
    const output = await new Promise((resolve) => canvas.toBlob(resolve, outputType, 0.9));
    if (!output) return file;
    return blobToFile(output, file);
  } catch {
    return file;
  }
}
