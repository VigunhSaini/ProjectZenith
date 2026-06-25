"use client";

import { useEffect, useState, useRef } from "react";
import { CelestialObject } from "@/lib/celestial";
import { ObserverLocation } from "@/store/zenith";
import { fetchWikipediaSummary } from "@/lib/wikipedia";
import { formatDist } from "@/lib/coordinates";

// Client-side cache keyed by: `${objectId}-${mode}`
const apiCache = new Map<string, string>();

function getLightTravelTime(distanceKm: number): string {
  const c = 299792.458; // speed of light in km/s
  const seconds = distanceKm / c;
  if (seconds < 1) return "less than a second";
  if (seconds < 60) return `${seconds.toFixed(0)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hours`;
  const days = hours / 24;
  if (days < 365.25) return `${days.toFixed(0)} days`;
  const years = days / 365.25;
  return `${years.toFixed(0)} years`;
}

export function useGemini(
  object: CelestialObject | null,
  mode: "immersive" | "scientific",
  location: ObserverLocation | null
) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track active fetch to avoid race conditions
  const activeRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!object || !location) {
      setDescription(null);
      setError(null);
      return;
    }

    const cacheKey = `${object.id}-${mode}`;
    const cachedText = apiCache.get(cacheKey);

    if (cachedText) {
      setDescription(cachedText);
      setError(null);
      return;
    }

    const fetchDescription = async () => {
      setLoading(true);
      setError(null);
      activeRequestRef.current = cacheKey;

      const formattedDistance = formatDist(object.distanceKm);
      const lightTime = getLightTravelTime(object.distanceKm);

      const prompt =
        mode === "immersive"
          ? `Describe the celestial body "${object.name}" (${object.category}) poetically. It is currently at an elevation of ${object.alt.toFixed(1)}° above the horizon from ${location.name}, ${formattedDistance} away. The light the user is seeing left ${object.name} ${lightTime} ago. Write 2 emotional, poetic sentences about our connection to it. Do not include markdown formatting or labels like "poetic description".`
          : `Provide precise, technical astronomical details for observing "${object.name}" (${object.category}) from latitude ${location.lat.toFixed(2)}°N, longitude ${location.lon.toFixed(2)}°E. Output current apparition specifics, magnitude ${object.magnitude.toFixed(1)}, elevation ${object.alt.toFixed(1)}°, and key telemetry facts. Write 3 highly concise, technical sentences. Do not include markdown formatting.`;

      try {
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        // If request was cancelled in background by another click, exit
        if (activeRequestRef.current !== cacheKey) return;

        if (!res.ok) {
          throw new Error(`Gemini status code: ${res.status}`);
        }

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const text = data.text.trim();
        apiCache.set(cacheKey, text);
        setDescription(text);
      } catch (err) {
        if (activeRequestRef.current !== cacheKey) return;
        
        console.warn("Gemini fetch failed, attempting Wikipedia fallback:", err);

        // Fallback to Wikipedia summary
        try {
          const wikiText = await fetchWikipediaSummary(object.name, object.category);
          if (activeRequestRef.current !== cacheKey) return;

          if (wikiText) {
            const sanitizedWiki = wikiText.trim();
            apiCache.set(cacheKey, sanitizedWiki);
            setDescription(sanitizedWiki);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load explanation");
          }
        } catch {
          if (activeRequestRef.current !== cacheKey) return;
          setError("Failed to load explanation from AI and Wikipedia fallbacks");
        }
      } finally {
        if (activeRequestRef.current === cacheKey) {
          setLoading(false);
        }
      }
    };

    fetchDescription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object?.id, mode, location]);

  return { description, loading, error };
}
