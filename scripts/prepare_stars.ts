/**
 * prepare_stars.ts — Project Zenith star data preparation script
 *
 * Downloads the HYG (Hipparcos-Yale-Gliese) v3.7 star catalogue from GitHub
 * (gzipped CSV), decompresses it, filters to magnitude < 5 (naked-eye stars),
 * maps B-V color index to CSS hex colors, and writes public/data/hyg_stars.json.
 *
 * Run with: npm run prepare-stars
 */

import * as https from "https";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";

// HYG v3.8 (latest) — main branch, gzip-compressed CSV
const HYG_GZ_URL =
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v38.csv.gz";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "hyg_stars.json"
);

const MAG_LIMIT = 5.0;

interface StarRecord {
  id: number;
  name: string;
  ra: number;    // decimal hours
  dec: number;   // decimal degrees
  mag: number;
  color: string; // CSS hex
  distLy: number;
}

/**
 * Map a B-V color index to a CSS hex string approximating stellar color.
 */
function bvToColor(bv: number | null): string {
  if (bv === null || isNaN(bv)) return "#FFFFFF";
  if (bv < -0.3) return "#9BB0FF"; // O-type: blue
  if (bv < 0.0)  return "#AABFFF"; // B-type: blue-white
  if (bv < 0.3)  return "#CAD7FF"; // A-type: white
  if (bv < 0.6)  return "#F8F7FF"; // F-type: yellow-white
  if (bv < 0.8)  return "#FFF4EA"; // G-type: yellow (sun)
  if (bv < 1.0)  return "#FFD2A1"; // K-type: orange
  if (bv < 1.5)  return "#FF9B52"; // M-type: orange-red
  return "#FF4500"; // late M: deep red
}

/**
 * Download a gzipped URL and return decompressed text.
 */
function downloadGzip(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const get = (u: string) => {
      https.get(u, { headers: { "Accept-Encoding": "identity" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }

        const gunzip = zlib.createGunzip();
        const chunks: Buffer[] = [];

        res.pipe(gunzip);
        gunzip.on("data", (chunk: Buffer) => chunks.push(chunk));
        gunzip.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        gunzip.on("error", reject);
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

/**
 * Parse a CSV line respecting quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log("⬇️  Downloading HYG v3.8 catalogue (gzipped)…");
  const csv = await downloadGzip(HYG_GZ_URL);

  const lines = csv.split("\n");
  const header = parseCSVLine(lines[0]);

  const idx = {
    id:     header.indexOf("id"),
    proper: header.indexOf("proper"),
    ra:     header.indexOf("ra"),
    dec:    header.indexOf("dec"),
    dist:   header.indexOf("dist"),
    mag:    header.indexOf("mag"),
    ci:     header.indexOf("ci"),
  };

  console.log(`📊 Parsed header: ${header.length} columns`);

  const stars: StarRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < Math.max(...Object.values(idx)) + 1) continue;

    const mag = parseFloat(cols[idx.mag]);
    if (isNaN(mag) || mag > MAG_LIMIT) continue;

    const ra = parseFloat(cols[idx.ra]);
    const dec = parseFloat(cols[idx.dec]);
    if (isNaN(ra) || isNaN(dec)) continue;

    const dist = parseFloat(cols[idx.dist]);
    const distLy = isNaN(dist) || dist <= 0 ? 0 : dist * 3.26156;

    const bvRaw = idx.ci >= 0 ? parseFloat(cols[idx.ci]) : NaN;
    const bv = isNaN(bvRaw) ? null : bvRaw;

    stars.push({
      id: parseInt(cols[idx.id], 10) || i,
      name: (idx.proper >= 0 ? cols[idx.proper] : "") || "",
      ra,
      dec,
      mag,
      color: bvToColor(bv),
      distLy,
    });
  }

  console.log(`✅ Filtered to ${stars.length} stars (mag < ${MAG_LIMIT})`);

  const outDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(stars, null, 0));
  const kb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`💾 Written to ${OUTPUT_PATH} (${kb} KB)`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
