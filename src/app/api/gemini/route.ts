import { NextResponse } from "next/server";

// Server-side in-memory rate limiter tracking timestamps by client IP
const ipRequests = new Map<string, number[]>();
const LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequests.get(ip) || [];
  
  // Filter timestamps to only keep those within the 1-minute window
  const activeTimestamps = timestamps.filter((t) => now - t < LIMIT_WINDOW_MS);
  
  if (activeTimestamps.length >= MAX_REQUESTS) {
    ipRequests.set(ip, activeTimestamps);
    return true;
  }
  
  activeTimestamps.push(now);
  ipRequests.set(ip, activeTimestamps);
  return false;
}

export async function POST(request: Request) {
  try {
    // Determine client IP address
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                     request.headers.get("x-real-ip") || 
                     "anonymous";

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 15 requests per minute are allowed." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "Invalid JSON body or missing prompt string" }, { status: 400 });
    }
    const { prompt } = body;

    // Security: cap prompt length to prevent quota abuse / large payload attacks
    const MAX_PROMPT_CHARS = 4000;
    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `Prompt exceeds maximum length of ${MAX_PROMPT_CHARS} characters` },
        { status: 413 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Handle safety / finish blocks explicitly
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return NextResponse.json(
        { error: `Generation stopped: ${candidate.finishReason}` },
        { status: 422 }
      );
    }

    const text = candidate?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
