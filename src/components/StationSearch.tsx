// src/components/StationSearch.tsx
import { useState, useEffect } from 'react';
import './StationSearch.css';

interface Station {
  station_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

interface StationSearchProps {
  onSelectStation: (station: Station) => void;
}

export default function StationSearch({ onSelectStation }: StationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchStations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/stations/search?q=${encodeURIComponent(query)}&limit=10`
        );
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching stations:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchStations, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (station: Station) => {
    setQuery(`${station.name} (${station.station_id})`);
    setShowResults(false);
    onSelectStation(station);
  };

  return (
    <div className="station-search">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search for a weather station..."
          className="search-input"
        />
        {isLoading && <div className="loading-spinner">⏳</div>}
      </div>

      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((station) => (
            <div
              key={station.station_id}
              className="search-result-item"
              onClick={() => handleSelect(station)}
            >
              <div className="station-name">
                {station.name || station.station_id}
              </div>
              <div className="station-details">
                {station.station_id} • {station.state}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="search-results">
          <div className="no-results">No stations found</div>
        </div>
      )}
    </div>
  );
}