/**
 * copy-cesium-assets.mjs
 *
 * Postinstall script: copies CesiumJS build assets from node_modules
 * to public/cesium/ so they can be served statically.
 *
 * This is the recommended approach for Next.js 14 — more reliable than
 * copy-webpack-plugin which conflicts with the SWC minifier and Turbopack.
 */

import { cpSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const src = join(root, "node_modules", "cesium", "Build", "Cesium");
const dest = join(root, "public", "cesium");

if (!existsSync(src)) {
  console.warn(
    "⚠️  cesium not yet installed — skipping Cesium asset copy.\n" +
      "   Run `npm install` to install all dependencies first."
  );
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

try {
  cpSync(src, dest, { recursive: true });
  console.log(`✅ Cesium assets copied: node_modules/cesium/Build/Cesium → public/cesium/`);
} catch (err) {
  console.error("❌ Failed to copy Cesium assets:", err.message);
  process.exit(1);
}
