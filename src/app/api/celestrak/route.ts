import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

// Baseline fallback TLE dataset in case CelesTrak is blocked on first boot
const DEFAULT_FALLBACK_TLE = `ISS (ZARYA)
1 25544U 98067A   26175.56834032  .00017169  00000-0  30386-3 0  9990
2 25544  51.6409 308.2045 0004543 273.7438 174.1524 15.49887714459814
HST
1 20580U 90037B   26175.29166667  .00001000  00000-0  10000-3 0  9991
2 20580  28.4690  81.1000 0003000 110.2000 250.1000 15.00000000000000
TIANGONG
1 48274U 21035A   26175.50000000  .00005000  00000-0  50000-4 0  9992
2 48274  41.4700 120.3000 0002000 320.1000 150.2000 15.60000000000000`;

let cachedTlesText = DEFAULT_FALLBACK_TLE;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET() {
  const now = Date.now();

  // If cache is valid (less than 2 hours old), return it immediately
  if (lastFetchTime > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
    return new NextResponse(cachedTlesText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const celestrakUrl = "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=2le";
    let text = "";
    let isFetched = false;
    let responseStatus = 0;

    try {
      const response = await fetch(celestrakUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      responseStatus = response.status;
      if (response.ok) {
        const fetchedText = await response.text();
        if (fetchedText.includes("1 ") && fetchedText.includes("2 ") && fetchedText.split("\n").length > 5) {
          text = fetchedText;
          isFetched = true;
        }
      }
    } catch (e) {
      console.warn("CelesTrak default fetch failed, trying curl fallback...", e);
    }

    if (!isFetched) {
      console.warn(`CelesTrak default fetch returned status ${responseStatus}. Trying curl.exe fallback...`);
      try {
        const fetchedText = execSync(`curl.exe -s -A "Mozilla/5.0" "${celestrakUrl}"`, { encoding: "utf-8", timeout: 10000 });
        if (fetchedText.includes("1 ") && fetchedText.includes("2 ") && fetchedText.split("\n").length > 5) {
          text = fetchedText;
          isFetched = true;
          console.log("CelesTrak curl fallback succeeded!");
        }
      } catch (err) {
        console.error("CelesTrak curl fallback failed:", err);
      }
    }

    if (isFetched) {
      cachedTlesText = text;
      lastFetchTime = now;
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Cache": "MISS",
        },
      });
    }

    // If rate-limited or offline, fall back to the last cached TLEs
    console.warn("CelesTrak all fetch methods failed. Serving cached stale data.");
    return new NextResponse(cachedTlesText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Cache": "STALE",
      },
    });
  } catch (error) {
    console.error("CELESTRAK FETCH ERROR:", error);
    return new NextResponse(cachedTlesText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Cache": "STALE-ERROR",
      },
    });
  }
}
