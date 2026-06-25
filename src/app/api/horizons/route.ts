import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("target");

    if (!target) {
      return NextResponse.json({ error: "Target parameter is required" }, { status: 400 });
    }

    const ALLOWED_TARGETS = new Set(["199", "299", "301", "499", "599", "699", "799", "899"]);
    if (!ALLOWED_TARGETS.has(target)) {
      return NextResponse.json({ error: "Invalid target command command id" }, { status: 400 });
    }

    const now = new Date();
    const stop = new Date(now.getTime() + 60_000); // 1 minute window
    const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

    const params = new URLSearchParams({
      format: "text",
      COMMAND: `'${target}'`,
      OBJ_DATA: "NO",
      MAKE_EPHEM: "YES",
      EPHEM_TYPE: "OBSERVER",
      CENTER: "500@399", // geocenter
      START_TIME: `'${fmt(now)}'`,
      STOP_TIME: `'${fmt(stop)}'`,
      STEP_SIZE: "1m",
      QUANTITIES: "1", // RA & Dec only
    });

    const horizonsUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
    
    const response = await fetch(horizonsUrl);
    if (!response.ok) {
      throw new Error(`Horizons server returned HTTP ${response.status}`);
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("HORIZONS PROXY ERROR:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
