import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const publicImageOrigin = process.env.VITE_PUBLIC_IMAGE_ORIGIN || "https://YOUR_BUCKET_ID.r2.dev";
const command = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npm";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run build"] : ["run", "build"];
const child = spawn(command, args, {
  env: {
    ...process.env,
    VITE_API_MODE: "worker",
    VITE_API_BASE_URL: "",
    VITE_PUBLIC_IMAGE_ORIGIN: publicImageOrigin,
  },
  stdio: "inherit",
});

function verifyWorkerBundle() {
  const assetDirectory = path.resolve(process.cwd(), "dist", "assets");
  const bundleText = readdirSync(assetDirectory)
    .filter((fileName) => fileName.endsWith(".js"))
    .map((fileName) => readFileSync(path.join(assetDirectory, fileName), "utf8"))
    .join("\n");

  if (publicImageOrigin === "https://img.example.com") {
    throw new Error("Worker build cannot use the demo image origin");
  }
  if (bundleText.includes("https://img.example.com")) {
    throw new Error("Worker bundle still contains the demo image origin");
  }
  if (!/=["']worker["']/.test(bundleText)) {
    throw new Error("Worker bundle does not contain the persistent Worker API mode");
  }
  if (/(?:=|:)["']demo["']/.test(bundleText)) {
    throw new Error("Worker bundle still contains the demo API mode");
  }
}

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Worker build stopped by ${signal}`);
    process.exitCode = 1;
    return;
  }
  if (code !== 0) {
    process.exitCode = code ?? 1;
    return;
  }
  try {
    verifyWorkerBundle();
    console.log("Worker bundle verified: persistent API mode is embedded and the public image origin is configured for runtime.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
});
