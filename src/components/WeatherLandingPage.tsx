// src/components/WeatherLandingPage.tsx
// Simple video intro splash page - user selects station, then views historical data
import { useState, useEffect, useRef } from 'react';
import './WeatherLandingPage.css';

interface Station {
  station_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

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
interface WeatherLandingPageProps {
  onStationSelect: (station: Station) => void;
  apiBaseUrl: string;
}

const WeatherLandingPage: React.FC<WeatherLandingPageProps> = ({
  onStationSelect,
  apiBaseUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyStation, setNearbyStation] = useState<SearchResult | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `${apiBaseUrl}/api/locations/nearby?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            // Build display name, handling missing state
            const displayName = data.state 
              ? `${data.name}, ${data.state}`
              : data.name;
            setNearbyStation({
              result_type: 'station',
              station_id: data.station_id,
              station_name: data.name,
              state: data.state || null,
              lat: data.lat,
              lon: data.lon,
              display_name: displayName,
              distance_mi: data.distance_mi,
              population: null,
            });
          }
        } catch (err) {
          console.error('Location detection failed:', err);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/stations/search?q=${encodeURIComponent(query)}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.slice(0, 8));
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStation = (result: SearchResult) => {
    onStationSelect({
      station_id: result.station_id,
      name: result.station_name || result.station_id,
      state: result.state || '',
      lat: result.lat,
      lon: result.lon,
    });
  };

  const handleUseMyLocation = () => {
    if (nearbyStation) {
      handleSelectStation(nearbyStation);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleSelectStation(searchResults[0]);
    }
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div className="video-landing">
      {/* Video Background */}
      <div className="video-bg-container">
        <video
          autoPlay
          muted
          loop
          playsInline
          className={`video-bg ${videoLoaded ? 'loaded' : ''}`}
          onLoadedData={() => setVideoLoaded(true)}
          poster="/clouds-poster.jpg"
        >
          {/* Add your video file to public folder */}
          <source src="/clouds.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay" />
      </div>

      {/* Content */}
      <div className="landing-content">
        <div className="landing-header">
          <h1 className="landing-title">
            <span className="title-icon">☁️</span>
            Weather History
          </h1>
          <p className="landing-subtitle">
            Explore historical weather data for any location
          </p>
        </div>

        {/* Search Box */}
        <div className="search-container" ref={searchRef}>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search city, zip code, or airport..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              onKeyDown={handleKeyDown}
            />
            {isSearching && <span className="search-spinner" />}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="search-results">
              {isSearching ? (
                <div className="search-loading">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result, index) => (
              <button
                key={`${result.station_id}-${index}`}
                className="search-result-item"
                onClick={() => handleSelectStation(result)}
              >
                <div className="result-text">
                  {result.result_type === 'city' || result.result_type === 'zipcode' ? (
                    // <>
                    //   <span className="result-name">{result.display_name}</span>
                    //   <span className="result-secondary">
                    //     Pop. {result.population?.toLocaleString() || 'N/A'}
                    //   </span>
                    // </>
            <>
              <div className="result-name">
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
                      <span className="result-name">
                        {result.station_name || result.station_id} ({result.station_id})
                        {result.distance_mi ? ` (${result.distance_mi.toFixed(1)} mi)` : ''}
                      </span>
                      <span className="result-secondary">Weather Station</span>
                    </>
                  )}
                </div>
              </button>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="search-no-results">No locations found</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Use My Location Button */}
        <button
          className="location-button"
          onClick={handleUseMyLocation}
          disabled={isLocating || !nearbyStation}
        >
          {isLocating ? (
            <>
              <span className="location-spinner" />
              Finding your location...
            </>
          ) : nearbyStation ? (
            <>
              <span className="location-icon">📍</span>
              Use my location: {nearbyStation.display_name}
              {nearbyStation.distance_mi && (
                <span className="location-distance">
                  ({nearbyStation.distance_mi.toFixed(1)} mi)
                </span>
              )}
            </>
          ) : (
            <>
              <span className="location-icon">📍</span>
              Use my location
            </>
          )}
        </button>

        {/* Footer */}
        <div className="landing-footer">
          <p>Data from NOAA, ACIS, and Iowa Environmental Mesonet</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherLandingPage;