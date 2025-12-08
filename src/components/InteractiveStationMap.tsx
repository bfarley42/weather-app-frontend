// src/components/InteractiveStationMap.tsx
// V2 - Cleaner UI, proximity-based loading, hover tooltips
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../config';

interface Station {
  station_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

interface StationWithTemp extends Station {
  avg_temp?: number | null;
  hasData?: boolean;
}

interface StationSummary {
  station_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  avg_high_f: number | null;
  max_high_f: number | null;
  min_low_f: number | null;
  avg_low_f: number | null;
  total_precip_in: number;
  total_snow_in: number;
  days_count: number;
}

interface InteractiveStationMapProps {
  startDate: string;
  endDate: string;
  darkMode?: boolean;
  metric?: 'tmax' | 'tmin' | 'prcp' | 'snow';
  selectedStation?: Station | null;
  onStationSelect: (station: Station) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

// Map style options
const MAP_STYLES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  gray: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

// Component to handle map events and load stations on move
function MapEventHandler({ 
  onBoundsChange,
  onZoomChange,
  selectedStation 
}: { 
  onBoundsChange: (bounds: L.LatLngBounds, center: L.LatLng) => void;
  onZoomChange: (zoom: number) => void;
  selectedStation?: Station | null;
}) {
  const map = useMap();
  const hasInitialized = useRef(false);

  // Initial load and when bounds change
  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds(), map.getCenter());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds(), map.getCenter());
      onZoomChange(map.getZoom());
    }
  });

  // Initial bounds on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      // Small delay to ensure map is ready
      setTimeout(() => {
        onBoundsChange(map.getBounds(), map.getCenter());
        onZoomChange(map.getZoom());
        hasInitialized.current = true;
      }, 100);
    }
  }, []);

  // Pan to selected station
  useEffect(() => {
    if (selectedStation) {
      map.flyTo([selectedStation.lat, selectedStation.lon], 8, { duration: 1 });
    }
  }, [selectedStation?.station_id]);

  return null;
}

export default function InteractiveStationMap({
  startDate,
  endDate,
  darkMode = false,
  metric = 'tmax',
  selectedStation,
  onStationSelect,
  initialCenter = [39.8, -98.6],
  initialZoom = 5
}: InteractiveStationMapProps) {
  const [stations, setStations] = useState<StationWithTemp[]>([]);
  const [summaries, setSummaries] = useState<Map<string, StationSummary>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStationId, setLoadingStationId] = useState<string | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>(darkMode ? 'dark' : 'light');
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const lastFetchRef = useRef<string>('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [_locationLoading, setLocationLoading] = useState(true);

  // Update map style when darkMode changes
  useEffect(() => {
    setMapStyle(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Clear summaries when date range changes
  useEffect(() => {
    setSummaries(new Map());
    // Re-fetch temperatures for visible stations
    stations.forEach(s => {
      fetchStationTemp(s);
    });
  }, [startDate, endDate]);

  // Get user's GPS location on mount
useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [
          position.coords.latitude, 
          position.coords.longitude
        ];
        setUserLocation(loc);
        setLocationLoading(false);
        // Trigger station fetch for user's location
        fetchNearbyStations(loc[0], loc[1]);
      },
      (error) => {
        console.log('Geolocation unavailable:', error.message);
        setLocationLoading(false);
        // Will use initialCenter as fallback
      },
      { timeout: 5000 }
    );
  } else {
    setLocationLoading(false);
  }
}, []);

  // // Fetch stations near a point (using proximity query)
  // const fetchNearbyStations = useCallback(async (lat: number, lon: number) => {
  //   const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  //   if (lastFetchRef.current === cacheKey) return;
  //   lastFetchRef.current = cacheKey;

  //   setIsLoading(true);
  //   try {
  //     // Try the nearby endpoint first
  //     let response = await fetch(
  //       `${API_URL}/api/stations/nearby?lat=${lat}&lon=${lon}&limit=150`
  //     );
      
  //     // Fall back to list if nearby doesn't exist
  //     if (!response.ok) {
  //       response = await fetch(`${API_URL}/api/stations/list?limit=500`);
  //     }
      
  //     if (response.ok) {
  //       const data: Station[] = await response.json();
        
  //       // Initialize stations with no temp data yet
  //       const stationsWithTemp: StationWithTemp[] = data.map(s => ({
  //         ...s,
  //         avg_temp: null,
  //         hasData: false
  //       }));
        
  //       setStations(stationsWithTemp);
  //       console.log('Stations loaded:', stationsWithTemp.length);
  //       console.log('Fetching temps for first 50...');
                
  //       // Fetch temps for first batch (visible ones)
  //       const firstBatch = stationsWithTemp.slice(0, 50);
  //       firstBatch.forEach(s => fetchStationTemp(s));
  //     }
  //   } catch (error) {
  //     console.error('Error fetching stations:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [startDate, endDate]);

  // Fetch just the avg temp for a single station (lightweight)
  const fetchStationTemp = useCallback(async (station: Station) => {
    try {
      const response = await fetch(
        `${API_URL}/api/weather/summarystats?station=${station.station_id}&start=${startDate}&end=${endDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const avgTemp = metric === 'tmin' ? data.avg_low_f : data.avg_high_f;
        
        setStations(prev => prev.map(s => 
          s.station_id === station.station_id 
            ? { ...s, avg_temp: avgTemp, hasData: data.days_count > 0 }
            : s
        ));
        
        console.log('fetchStationTemp called for:', station.station_id);
        // Also cache the full summary
        setSummaries(prev => new Map(prev).set(station.station_id, {
          ...station,
          ...data
        }));
      }
    } catch (error) {
      // Silent fail - station just won't have temp displayed
    }
  }, [startDate, endDate, metric]);
  
// Fetch stations near a point (using proximity query)
const fetchNearbyStations = useCallback(async (lat: number, lon: number) => {
  const cacheKey = `${lat.toFixed(1)},${lon.toFixed(1)}`; // Less precise = fewer duplicate calls
  if (lastFetchRef.current === cacheKey) {
    console.log('Skipping duplicate fetch:', cacheKey);
    return;
  }
  lastFetchRef.current = cacheKey;

  setIsLoading(true);
  try {
    let response = await fetch(
      `${API_URL}/api/stations/nearby?lat=${lat}&lon=${lon}&limit=100`
    );
    
    if (!response.ok) {
      response = await fetch(`${API_URL}/api/stations/list?limit=500`);
    }
    
    if (response.ok) {
      const data: Station[] = await response.json();
      console.log('Stations loaded:', data.length);
      
      // IMPORTANT: Preserve existing temps when updating stations
      setStations(prev => {
        // Create a map of existing temps
        const existingTemps = new Map(
          prev.map(s => [s.station_id, { avg_temp: s.avg_temp, hasData: s.hasData }])
        );
        
        // Merge new stations with existing temps
        return data.map(s => ({
          ...s,
          avg_temp: existingTemps.get(s.station_id)?.avg_temp ?? null,
          hasData: existingTemps.get(s.station_id)?.hasData ?? false
        }));
      });
      
      // Only fetch temps for stations that don't have them yet
      setStations(current => {
        const stationsNeedingTemps = current.filter(s => s.avg_temp === null);
        console.log(`Fetching temps for ${stationsNeedingTemps.length} stations without temps...`);
        stationsNeedingTemps.slice(0, 50).forEach(s => fetchStationTemp(s));
        return current; // Return unchanged
      });
    }
  } catch (error) {
    console.error('Error fetching stations:', error);
  } finally {
    setIsLoading(false);
  }
}, [startDate, endDate, fetchStationTemp]);


  // Fetch full summary for hover
  const fetchFullSummary = useCallback(async (station: Station) => {
    if (summaries.has(station.station_id)) return;
    
    setLoadingStationId(station.station_id);
    try {
      const response = await fetch(
        `${API_URL}/api/weather/summarystats?station=${station.station_id}&start=${startDate}&end=${endDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSummaries(prev => new Map(prev).set(station.station_id, {
          ...station,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoadingStationId(null);
    }
  }, [startDate, endDate, summaries]);

  // Handle bounds change - load nearby stations
  const handleBoundsChange = useCallback((_bounds: L.LatLngBounds, center: L.LatLng) => {
    fetchNearbyStations(center.lat, center.lng);
  }, [fetchNearbyStations]);

// Get color based on temperature
const getColor = (temp: number | null | undefined): string => {
  console.log('getColor called with:', temp, typeof temp);
  
  if (temp === null || temp === undefined) {
    console.log('→ returning gray (no data)');
    return '#9CA3AF';
  }
  
  let color = '#9CA3AF';
  if (temp < 20) color = '#1E40AF';
  else if (temp < 32) color = '#3B82F6';
  else if (temp < 45) color = '#06B6D4';
  else if (temp < 55) color = '#10B981';
  else if (temp < 65) color = '#84CC16';
  else if (temp < 75) color = '#EAB308';
  else if (temp < 85) color = '#F97316';
  else if (temp < 95) color = '#EF4444';
  else color = '#DC2626';
  
  console.log(`→ temp ${temp}°F = ${color}`);
  return color;
};

  // Format temperature for display
  const formatTemp = (temp: number | null | undefined): string => {
    if (temp === null || temp === undefined) return '--';
    return `${Math.round(temp)}°`;
  };

  return (
    <div className="map-root" style={{
      width: '100%', 
      height: '600px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: darkMode 
        ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
        : '0 4px 20px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>

      <MapContainer
        // className="map-root"
        center={userLocation || (selectedStation ? [selectedStation.lat, selectedStation.lon] : initialCenter)}
        zoom={userLocation ? 8 : (selectedStation ? 7 : initialZoom)}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
         
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          className={darkMode ? "map-tiles dark-mode" : "map-tiles"}
          url={MAP_STYLES[mapStyle]}
        />
        
        <MapEventHandler 
          onBoundsChange={handleBoundsChange}
          onZoomChange={setZoomLevel}
          selectedStation={selectedStation}
        />
        
        {/* Station Markers */}
        {stations.map(station => {
          const summary = summaries.get(station.station_id);
          const isSelected = selectedStation?.station_id === station.station_id;
          const isHovered = hoveredStation === station.station_id;
          const isLoadingThis = loadingStationId === station.station_id;
          
          return (
            <CircleMarker
              key={`${station.station_id}-${station.avg_temp ?? 'null'}`}
              center={[station.lat, station.lon]}
              radius={isSelected ? 10 : isHovered ? 10 : 
                zoomLevel >= 8 ? 7 :
                zoomLevel >= 6 ? 4 : 3
              }
              fillColor={getColor(station.avg_temp)}
              color={isSelected ? '#FFD700' : (darkMode ? '#fff' : '#374151')}
              weight={isSelected ? 3 : 1}
              opacity={1}
              fillOpacity={0.9}
              eventHandlers={{
                click: () => {
                  // Direct click = go to charts
                  onStationSelect(station);
                },
                mouseover: (e) => {
                  setHoveredStation(station.station_id);
                  fetchFullSummary(station);
                  e.target.openPopup();
                },
                mouseout: (e) => {
                  setHoveredStation(null);
                  e.target.closePopup();
                }
              }}
            >
              {/* Hover Popup with Summary Stats */}
              <Popup 
                closeButton={false}
                autoPan={false}
                className="station-popup"
              >
                <div style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  minWidth: '200px',
                  padding: '4px'
                }}>
                  {/* Station Name */}
                  <div style={{ 
                    fontWeight: 700,
                    fontSize: '14px',
                    color: '#1F2937',
                    marginBottom: '2px'
                  }}>
                    {station.name}
                  </div>
                  <div style={{ 
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '8px'
                  }}>
                    {station.station_id} • {station.state}
                  </div>
                  
                  {isLoadingThis ? (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9CA3AF',
                      fontStyle: 'italic'
                    }}>
                      Loading...
                    </div>
                  ) : summary && summary.days_count > 0 ? (
                    <>
                      {/* Stats Row */}
                      <div style={{ 
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '6px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>High</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#EF4444' }}>
                            {summary.avg_high_f?.toFixed(0) || '--'}°
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Low</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#3B82F6' }}>
                            {summary.avg_low_f?.toFixed(0) || '--'}°
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Precip</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#06B6D4' }}>
                            {summary.total_precip_in.toFixed(1)}"
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#9CA3AF',
                        borderTop: '1px solid #E5E7EB',
                        paddingTop: '6px',
                        marginTop: '4px'
                      }}>
                        {summary.days_count} days • Click for charts
                      </div>
                    </>
                  ) : (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9CA3AF'
                    }}>
                      No data for this period
                    </div>
                  )}
                </div>
              </Popup>
              
              {/* Always-visible Tooltip with Temp - only at higher zoom */}
              {zoomLevel >= 8 && station.avg_temp !== null && (
                <Tooltip 
                  permanent
                  direction="right"
                  offset={[6, 0]}
                  className="temp-tooltip"
                  opacity={1}
                >
                  <span style={{
                    fontWeight: 600,
                    fontSize: '11px',
                    color: darkMode ? '#F3F4F6' : '#1F2937',
                    textShadow: darkMode 
                      ? '0 1px 2px rgba(0,0,0,0.8)' 
                      : '0 1px 2px rgba(255,255,255,0.8)'
                  }}>
                    {formatTemp(station.avg_temp)}
                  </span>
                </Tooltip>
              )}
            </CircleMarker>
          );
        })}
        <div
  className={
    darkMode
      ? "map-tint-overlay map-tint-overlay-dark"
      : "map-tint-overlay map-tint-overlay-light"
  }
/>
        
      </MapContainer>
          {/* TINT OVERLAY – sits above tiles, below the UI badges */}

    
    {/* Loading indicator */}
    {isLoading && (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
        color: darkMode ? '#F3F4F6' : '#1F2937',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        Loading stations...
      </div>
    )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
          color: darkMode ? '#F3F4F6' : '#1F2937',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          Loading stations...
        </div>
      )}
      
      {/* Minimal Map Style Switcher - Bottom Left */}
      <div style={{
        position: 'absolute',
        bottom: '25px',
        left: '10px',
        display: 'flex',
        gap: '4px',
        zIndex: 1000
      }}>
        {(['light', 'gray', 'voyager', 'dark'] as const).map(style => (
          <button
            key={style}
            onClick={() => setMapStyle(style)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: mapStyle === style 
                ? '2px solid #667eea' 
                : '1px solid rgba(0,0,0,0.2)',
              background: style === 'dark' ? '#1a1a2e' 
                : style === 'gray' ? '#e5e5e5'
                : style === 'voyager' ? '#f0ede8'
                : '#ffffff',
              cursor: 'pointer',
              opacity: mapStyle === style ? 1 : 0.7,
              transition: 'all 0.2s'
            }}
            title={style.charAt(0).toUpperCase() + style.slice(1)}
          />
        ))}
      </div>
      
      {/* Station count - Top Right, minimal */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
        color: darkMode ? '#D1D5DB' : '#6B7280',
        padding: '6px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        {stations.length} stations
      </div>
      
      {/* Custom CSS for tooltips */}
      <style>{`
/* The MapContainer must have class "map-root" */
.map-root {
  position: relative;
}

/* Tint overlay placed INSIDE MapContainer */
.map-root .map-tint-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  pointer-events: none;

  /* MUST be between tile-pane (z=200) and marker-pane (z=600) */
  z-index: 450;

  mix-blend-mode: multiply;
}

.map-tint-overlay-light {
  background: rgba(56, 189, 248, 0.18);
}

.map-tint-overlay-dark {
  background: rgba(79, 70, 229, 0.25);
}


  /* === TOOLTIP & POPUP STYLES (unchanged) === */

  .temp-tooltip {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .temp-tooltip::before {
    display: none !important;
  }
  .station-popup .leaflet-popup-content-wrapper {
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  }
  .station-popup .leaflet-popup-content {
    margin: 10px 12px;
  }
  .station-popup .leaflet-popup-tip {
    display: none;
  }
  .map-root {
  position: relative;
}

.map-root .map-tint-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  pointer-events: none;
  z-index: 450; /* ABOVE tile pane (z=200), BELOW markers (600) */
  mix-blend-mode: multiply;
}

.map-tint-overlay-light {
  background: rgba(0, 127, 247, 0.15);
}
.map-tint-overlay-dark {
  background: rgba(79, 70, 229, 0.25);
}  
`}</style>

    </div>
  );
}