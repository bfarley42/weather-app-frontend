// src/components/LocationSearch.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config';
import './LocationSearch.css';

interface LocationResult {
  type: 'city' | 'zipcode' | 'station';
  display_name: string;
  station_id: string;
  lat: number;
  lon: number;
  state?: string;
  population?: number;
}

interface LocationSearchProps {
  onSelectLocation: (location: LocationResult) => void;
  onUseCurrentLocation?: () => void;
  darkMode?: boolean;
  placeholder?: string;
  currentLocationName?: string;
}

export default function LocationSearch({
  onSelectLocation,
  onUseCurrentLocation,
  darkMode = true,
  placeholder = "Search city, zip, or station...",
  currentLocationName,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch results with debounce
  const searchLocations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/locations/search?q=${encodeURIComponent(searchQuery)}&limit=8`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchLocations(query);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchLocations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (location: LocationResult) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelectLocation(location);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'city': return '🏙️';
      case 'zipcode': return '📮';
      case 'station': return '📡';
      default: return '📍';
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`location-search ${darkMode ? 'dark' : 'light'}`}
    >
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
        />
        {isLoading && <span className="loading-spinner">⏳</span>}
      </div>

      {/* Current location button */}
      {onUseCurrentLocation && (
        <button 
          className="current-location-btn"
          onClick={onUseCurrentLocation}
          title="Use my current location"
        >
          📍 {currentLocationName || 'Use my location'}
        </button>
      )}

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="search-results">
          {results.map((result, index) => (
            <li
              key={`${result.type}-${result.station_id}-${index}`}
              className={`search-result-item ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="result-icon">{getTypeIcon(result.type)}</span>
              <div className="result-text">
                <span className="result-name">{result.display_name}</span>
                <span className="result-meta">
                  {result.type === 'city' && result.population 
                    ? `Pop. ${result.population.toLocaleString()}`
                    : result.type === 'station' 
                    ? 'Weather Station'
                    : 'Zip Code'
                  }
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="no-results">
          No locations found for "{query}"
        </div>
      )}
    </div>
  );
}