"use client";

import { useState, useCallback, useRef } from "react";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface QuickCity {
  name: string;
  lat: number;
  lon: number;
  emoji: string;
}

const QUICK_CITIES: QuickCity[] = [
  { name: "New York",  lat: 40.7128,  lon: -74.006,   emoji: "🗽" },
  { name: "London",   lat: 51.5074,  lon: -0.1278,    emoji: "🎡" },
  { name: "Tokyo",    lat: 35.6762,  lon: 139.6503,   emoji: "🗼" },
  { name: "Sydney",   lat: -33.8688, lon: 151.2093,   emoji: "🦘" },
  { name: "Mumbai",   lat: 19.076,   lon: 72.8777,    emoji: "🌊" },
];

interface LocationSearchProps {
  onLocationSelect: (lat: number, lon: number, name: string) => void;
}

/**
 * Try to parse a raw coordinate string in any of these formats:
 *   "28.6139, 77.2090"
 *   "28.6139° N, 77.2090° E"
 *   "28°36'50\"N 77°12'32\"E"
 *   "-33.8688, 151.2093"
 *
 * Returns { lat, lon } or null if not a coordinate string.
 */
function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const s = input.trim();

  // Format 1: decimal degrees "lat, lon" or "lat lon"
  const decimalMatch = s.match(
    /^([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*[NSns]?\s*[,\s]\s*([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*[EWew]?$/
  );
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lon = parseFloat(decimalMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  // Format 2: "28.6139° N, 77.2090° E" or "28.6139N, 77.2090E"
  const dirMatch = s.match(
    /([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([NSns])[,\s]+([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([EWew])/
  );
  if (dirMatch) {
    let lat = parseFloat(dirMatch[1]);
    let lon = parseFloat(dirMatch[3]);
    if (dirMatch[2].toUpperCase() === "S") lat = -Math.abs(lat);
    if (dirMatch[4].toUpperCase() === "W") lon = -Math.abs(lon);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  // Format 3: DMS "28°36'50"N 77°12'32"E"
  const dmsMatch = s.match(
    /(\d{1,3})°\s*(\d{1,2})'\s*(\d{1,2}(?:\.\d+)?)"?\s*([NSns])\s*[,\s]*(\d{1,3})°\s*(\d{1,2})'\s*(\d{1,2}(?:\.\d+)?)"?\s*([EWew])/
  );
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]) + parseFloat(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600;
    const lonDeg = parseFloat(dmsMatch[5]) + parseFloat(dmsMatch[6]) / 60 + parseFloat(dmsMatch[7]) / 3600;
    const lat = dmsMatch[4].toUpperCase() === "S" ? -latDeg : latDeg;
    const lon = dmsMatch[8].toUpperCase() === "W" ? -lonDeg : lonDeg;
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }

  return null;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coordHint, setCoordHint] = useState<{ lat: number; lon: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      const data: SearchResult[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Check if the input looks like raw coordinates — handle instantly
    const coords = parseCoordinates(val);
    if (coords) {
      setCoordHint(coords);
      setResults([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setCoordHint(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleCoordHintClick = () => {
    if (!coordHint) return;
    const label = `${coordHint.lat.toFixed(4)}°, ${coordHint.lon.toFixed(4)}°`;
    onLocationSelect(coordHint.lat, coordHint.lon, label);
    setQuery(label);
    setCoordHint(null);
  };

  const handleResultClick = (r: SearchResult) => {
    onLocationSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
    setQuery(r.display_name.split(",")[0]);
    setResults([]);
  };

  const handleQuickCity = (city: QuickCity) => {
    onLocationSelect(city.lat, city.lon, city.name);
    setQuery(city.name);
    setResults([]);
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onLocationSelect(latitude, longitude, "My Location");
        setQuery("My Location");
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 10_000 }
    );
  };


  return (
    <div className="location-search-container" id="location-search">
      {/* Glass card */}
      <div className="search-card">
        <p className="search-label">📍 Select your observation point</p>

        {/* Search input */}
        <div className="search-input-row">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="City name or coordinates: 28.6139, 77.2090"
              className="search-input"
              id="location-search-input"
              autoComplete="off"
            />
            {isSearching && <span className="search-spinner" />}
          </div>

          <button
            onClick={handleMyLocation}
            disabled={isLocating}
            className="locate-btn hidden md:flex"
            id="locate-me-btn"
            title="Use my current location"
          >
            {isLocating ? "⌛" : "📡"}
          </button>
        </div>

        {/* Coordinate hint — shown when input is detected as raw lat/lon */}
        {coordHint && (
          <div
            onClick={handleCoordHintClick}
            className="search-results"
            id="coord-hint-result"
            style={{ cursor: "pointer" }}
          >
            <div
              className="search-result-item"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span>
                📌 <strong>{coordHint.lat.toFixed(4)}°</strong>, <strong>{coordHint.lon.toFixed(4)}°</strong>
                <span style={{ marginLeft: 8, opacity: 0.5, fontSize: "0.75rem" }}>Coordinates detected</span>
              </span>
              <span style={{ color: "#00d4ff", fontWeight: "bold", fontSize: "0.8rem" }}>Go →</span>
            </div>
          </div>
        )}

        {/* Autocomplete results */}
        {!coordHint && results.length > 0 && (

          <ul className="search-results" id="search-results-list">
            {results.map((r, i) => (
              <li
                key={i}
                onClick={() => handleResultClick(r)}
                className="search-result-item"
                id={`search-result-${i}`}
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}

        {/* Quick cities */}
        <div className="quick-cities" id="quick-cities">
          {QUICK_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => handleQuickCity(city)}
              className="city-chip"
              id={`city-chip-${city.name.toLowerCase().replace(" ", "-")}`}
            >
              {city.emoji} {city.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
