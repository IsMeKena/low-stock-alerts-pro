import { build } from "vite";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

async function copyDir(src: string, dest: string) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  try {
    // Build client (React + Vite)
    console.log("[build] Building client...");
    await build({
      mode: "production",
    });
    console.log("[build] Client built successfully");

    // Bundle server with esbuild
    console.log("[build] Bundling server...");
    execSync("npx esbuild server/index.ts --bundle --platform=node --outfile=dist/index.cjs --external:pg --external:@shopify/shopify-api --packages=external", {
      stdio: "inherit",
    });
    console.log("[build] Server bundled successfully");

    // Copy drizzle migrations to dist
    console.log("[build] Copying migrations...");
    copyDir("drizzle", path.join("dist", "drizzle"));
    console.log("[build] Migrations copied successfully");

    // Create startup script
    const startScript = `#!/usr/bin/env node
process.env.NODE_ENV = "production";
require("./index.cjs");
`;

    fs.writeFileSync(path.join("dist", "start.js"), startScript);
    fs.chmodSync(path.join("dist", "start.js"), 0o755);

    console.log("[build] Build complete");
  } catch (error) {
    console.error("[build] Build failed:", error);
    process.exit(1);
  }
}

main();
