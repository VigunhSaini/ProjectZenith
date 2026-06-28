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
  designation: string;
  ra: number;    // decimal hours
  dec: number;   // decimal degrees
  mag: number;
  color: string; // CSS hex
  distLy: number;
}

const GREEK_MAP: Record<string, string> = {
  Alp: "Alpha", Bet: "Beta", Gam: "Gamma", Del: "Delta", Eps: "Epsilon",
  Zet: "Zeta", Eta: "Eta", The: "Theta", Iot: "Iota", Kap: "Kappa",
  Lam: "Lambda", Mu: "Mu", Nu: "Nu", Xi: "Xi", Omi: "Omicron",
  Pi: "Pi", Rho: "Rho", Sig: "Sigma", Tau: "Tau", Ups: "Upsilon",
  Phi: "Phi", Chi: "Chi", Psi: "Psi", Ome: "Omega"
};

const CONSTELLATION_MAP: Record<string, string> = {
  And: "Andromedae", Ant: "Antliae", Aps: "Apodis", Aqr: "Aquarii", Aql: "Aquilae",
  Ara: "Arae", Ari: "Arietis", Aur: "Aurigae", Boo: "Boötis", Cae: "Caeli",
  Cam: "Camelopardalis", Cnc: "Cancri", CVn: "Canum Venaticorum", CMa: "Canis Majoris",
  CMi: "Canis Minoris", Cap: "Capricorni", Car: "Carinae", Cas: "Cassiopeiae",
  Cen: "Centauri", Cep: "Cephei", Cet: "Ceti", Cha: "Chamaeleontis", Cir: "Circini",
  Col: "Columbae", Com: "Comae Berenices", CrA: "Coronae Australis", CrB: "Coronae Borealis",
  Crv: "Corvi", Crt: "Crateris", Cru: "Crucis", Cyg: "Cygni", Del: "Delphini",
  Dor: "Doradus", Dra: "Draconis", Equ: "Equulei", Eri: "Eridani", For: "Fornacis",
  Gem: "Geminorum", Gru: "Gruis", Her: "Herculis", Hor: "Horologii", Hya: "Hydrae",
  Hyi: "Hydri", Ind: "Indi", Lac: "Lacertae", Leo: "Leonis", LMi: "Leonis Minoris",
  Lep: "Leporis", Lib: "Librae", Lup: "Lupi", Lyn: "Lyncis", Lyr: "Lyrae",
  Men: "Mensae", Mic: "Microscopii", Mon: "Monocerotis", Mus: "Muscae", Nor: "Normae",
  Oct: "Octantis", Oph: "Ophiuchi", Ori: "Orionis", Pav: "Pavonis", Peg: "Pegasi",
  Per: "Persei", Phe: "Phoenicis", Pic: "Pictoris", Psc: "Piscium", PsA: "Piscis Austrini",
  Pup: "Puppis", Pyx: "Pyxidis", Ret: "Reticuli", Sge: "Sagittae", Sgr: "Sagittarii",
  Sco: "Scorpii", Scl: "Sculptoris", Sct: "Scuti", Ser: "Serpentis", Sex: "Sextantis",
  Tau: "Tauri", Tel: "Telescopii", Tri: "Trianguli", TrA: "Trianguli Australis",
  Tuc: "Tucanae", UMa: "Ursae Majoris", UMi: "Ursae Minoris", Vel: "Velorum",
  Vir: "Virginis", Vol: "Volantis", Vul: "Vulpeculae"
};

function formatDesignation(
  bayer: string,
  flam: string,
  con: string,
  hr: string,
  hd: string,
  gl: string,
  id: string
): string {
  // 1. Try Bayer/Flamsteed Designation
  if (bayer || flam) {
    const greekPart = bayer ? bayer.split("-")[0] : "";
    const subPart = bayer && bayer.includes("-") ? bayer.split("-")[1] : "";
    const greekName = GREEK_MAP[greekPart] || greekPart;
    const conName = CONSTELLATION_MAP[con] || con;
    
    let des = "";
    if (flam) des += flam + " ";
    if (greekName) {
      des += greekName;
      if (subPart) des += " " + subPart;
      des += " ";
    }
    if (conName) des += conName;
    return des.trim();
  }
  
  // 2. Try Yale Bright Star (HR)
  if (hr) {
    return `HR ${hr}`;
  }
  
  // 3. Try Henry Draper (HD)
  if (hd) {
    return `HD ${hd}`;
  }
  
  // 4. Try Gliese
  if (gl) {
    return `Gliese ${gl}`;
  }
  
  // 5. Fallback to HYG ID
  return `HYG ${id}`;
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
  // If star catalog already exists (e.g. committed to repo), skip re-download
  if (fs.existsSync(OUTPUT_PATH)) {
    const kb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
    console.log(`✅ Star catalog already exists at ${OUTPUT_PATH} (${kb} KB) — skipping download.`);
    return;
  }

  console.log("⬇️  Downloading HYG v3.8 catalogue (gzipped)…");
  const csv = await downloadGzip(HYG_GZ_URL);

  const lines = csv.split("\n");
  const header = parseCSVLine(lines[0]);

  const idx = {
    id:     header.indexOf("id"),
    proper: header.indexOf("proper"),
    bayer:  header.indexOf("bayer"),
    flam:   header.indexOf("flam"),
    con:    header.indexOf("con"),
    hr:     header.indexOf("hr"),
    hd:     header.indexOf("hd"),
    gl:     header.indexOf("gl"),
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

    const bayer = idx.bayer >= 0 ? cols[idx.bayer] : "";
    const flam = idx.flam >= 0 ? cols[idx.flam] : "";
    const con = idx.con >= 0 ? cols[idx.con] : "";
    const hr = idx.hr >= 0 ? cols[idx.hr] : "";
    const hd = idx.hd >= 0 ? cols[idx.hd] : "";
    const gl = idx.gl >= 0 ? cols[idx.gl] : "";

    stars.push({
      id: parseInt(cols[idx.id], 10) || i,
      name: (idx.proper >= 0 ? cols[idx.proper] : "") || "",
      designation: formatDesignation(bayer, flam, con, hr, hd, gl, cols[idx.id]),
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
