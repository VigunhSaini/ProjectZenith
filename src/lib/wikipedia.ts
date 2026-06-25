/**
 * Client for Wikipedia REST API.
 * Provides instant fallback description data when Gemini is loading or fails.
 */

function getWikiTitle(name: string, category: string): string {
  const cleanName = name.trim();
  
  if (category === "iss" || cleanName.toLowerCase().includes("iss")) {
    return "International Space Station";
  }

  if (category === "planet") {
    switch (cleanName.toLowerCase()) {
      case "mercury":
        return "Mercury (planet)";
      case "venus":
        return "Venus";
      case "mars":
        return "Mars";
      case "jupiter":
        return "Jupiter";
      case "saturn":
        return "Saturn";
      case "uranus":
        return "Uranus";
      case "neptune":
        return "Neptune";
      default:
        return cleanName;
    }
  }

  // Handle stars (strip catalog prefix to get proper name if available)
  if (category === "star") {
    if (cleanName.startsWith("HYG")) {
      return "Star";
    }
    return cleanName;
  }

  return cleanName;
}

export async function fetchWikipediaSummary(name: string, category: string): Promise<string | null> {
  try {
    const title = getWikiTitle(name, category);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ProjectZenith/1.0 (contact@projectzenith.astralweb)"
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.extract || null;
  } catch {
    return null;
  }
}
