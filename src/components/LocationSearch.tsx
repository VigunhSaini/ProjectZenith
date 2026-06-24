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

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
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
              placeholder="Search a city or location…"
              className="search-input"
              id="location-search-input"
              autoComplete="off"
            />
            {isSearching && <span className="search-spinner" />}
          </div>

          <button
            onClick={handleMyLocation}
            disabled={isLocating}
            className="locate-btn"
            id="locate-me-btn"
            title="Use my current location"
          >
            {isLocating ? "⌛" : "📡"}
          </button>
        </div>

        {/* Autocomplete results */}
        {results.length > 0 && (
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
