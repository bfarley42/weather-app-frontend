// src/components/StationSearch.tsx
import { useState, useEffect } from 'react';
import './StationSearch.css';
import { API_URL } from '../config';

interface Station {
  station_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

// New interface matching the API response
interface SearchResult {
  result_type: 'city' | 'zipcode' | 'station';
  display_name: string;
  station_id: string;
  station_name: string | null;
  lat: number;
  lon: number;
  state: string | null;
  population: number | null;
  distance_mi: number | null;
}

interface StationSearchProps {
  onSelectStation: (station: Station) => void;
}

export default function StationSearch({ onSelectStation }: StationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
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
        const response = await fetch(`${API_URL}/api/stations/search?q=${encodeURIComponent(query)}&limit=10`);
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

  const handleSelect = (result: SearchResult) => {
    // Convert SearchResult to Station format for the callback
    const station: Station = {
      station_id: result.station_id,
      name: result.station_name || result.station_id,
      state: result.state || '',
      lat: result.lat,
      lon: result.lon
    };
    
    onSelectStation(station);

    // Clear search UI completely
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  // Get icon based on result type
  // const getResultIcon = (type: string) => {
  //   switch (type) {
  //     case 'city':
  //       return '🏙️';
  //     case 'zipcode':
  //       return '📍';
  //     case 'station':
  //       return '📡';
  //     default:
  //       return '📍';
  //   }
  // };

  // Get CSS class based on result type
  const getResultClass = (type: string) => {
    return `search-result-item result-type-${type}`;
  };

  return (
    <div className="station-search">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search city, zip code, or station..."
          className="search-input"
        />
        {isLoading && <div className="loading-spinner">⏳</div>}
      </div>
{/* 
      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((result, index) => (
            <div
              key={`${result.station_id}-${index}`}
              className={getResultClass(result.result_type)}
              onClick={() => handleSelect(result)}
            >
              <div className="result-content">
                {result.result_type === 'city' || result.result_type === 'zipcode' ? (
                  <>
                    <div className="result-primary">
                      {result.result_type === 'city' 
                        ? `${result.state ? result.display_name.split(',')[0] : result.display_name}, ${result.state}`
                        : `${result.display_name.split('—')[0].trim()}`
                      }
                    </div>
                    <div className="result-secondary">
                      Pop. {result.population?.toLocaleString() || 'N/A'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="result-primary">
                      {result.station_name || result.station_id} ({result.station_id})
                      {result.distance_mi ? ` (${result.distance_mi.toFixed(1)} mi)` : ''}
                    </div>
                    <div className="result-secondary">
                      Weather Station
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )} */}

      {showResults && results.length > 0 && (
  <div className="search-results">
    {results.map((result, index) => (
      <div
        key={`${result.station_id}-${index}`}
        className={getResultClass(result.result_type)}
        onClick={() => handleSelect(result)}
      >
        <div className="result-content">
          {result.result_type === 'city' || result.result_type === 'zipcode' ? (
            <>
              <div className="result-primary">
                {result.result_type === 'city' 
                  ? `${result.display_name.split(',')[0]}, ${result.state} `
                  : `${result.display_name.split('—')[0].trim()}`
                }
                    {result.population ? (
                <span className="result-secondary result-pop-inline">
                  {` • Pop. ${result.population.toLocaleString()}`}
                </span>
              ) : null}
              </div>
              <div className="result-secondary">
                {result.station_name || result.station_id} ({result.station_id})
                {result.distance_mi ? ` • ${result.distance_mi.toFixed(1)} mi` : ''}
                {/* {result.population ? ` • Pop. ${result.population.toLocaleString()}` : ''} */}
              </div>
            </>
          ) : (
            <>
              <div className="result-primary">
                {result.station_name || result.station_id} ({result.station_id})
              </div>
              <div className="result-secondary">
                Weather Station
                {result.distance_mi ? ` • ${result.distance_mi.toFixed(1)} mi` : ''}
              </div>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
)}

      {showResults && query.trim().length >= 2 && !isLoading && results.length === 0 && (
        <div className="search-results">
          <div className="no-results">No stations found</div>
        </div>
      )}
    </div>
  );
}