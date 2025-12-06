// src/components/MapView.tsx
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
}

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
  snow_in: number | null;
}

interface MapViewProps {
  data: DailyWeather[];
  selectedStation: Station;
  darkMode?: boolean;
  metric?: 'tmax' | 'tmin' | 'prcp' | 'snow';
}

// Helper component to recenter map when station changes
function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lon], 9); // Zoom level 9 ≈ 100 mile radius
  }, [lat, lon, map]);
  
  return null;
}

export default function MapView({ 
  data, 
  selectedStation,
  darkMode = false,
  metric = 'tmax'
}: MapViewProps) {
  
  // Calculate average temperature for selected metric
  const avgValue = useMemo(() => {
    const field = metric === 'tmax' ? 'tmax_f' : 
                  metric === 'tmin' ? 'tmin_f' :
                  metric === 'prcp' ? 'prcp_in' : 'snow_in';
    
    const values = data
      .map(d => d[field])
      .filter((v): v is number => v !== null);
    
    if (values.length === 0) return null;
    
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [data, metric]);

  // Get color based on value
  const getColor = (value: number | null): string => {
    if (value === null) return '#808080';
    
    if (metric === 'tmax') {
      // High temps: blue (cold) to red (hot)
      if (value < 32) return '#0000FF';
      if (value < 50) return '#00BFFF';
      if (value < 70) return '#FFD700';
      if (value < 85) return '#FF8C00';
      return '#FF0000';
    } else if (metric === 'tmin') {
      // Low temps
      if (value < 0) return '#000080';
      if (value < 20) return '#0000FF';
      if (value < 40) return '#00BFFF';
      if (value < 60) return '#FFD700';
      return '#FF8C00';
    } else if (metric === 'prcp') {
      // Precipitation: white (none) to blue (heavy)
      if (value === 0) return '#CCCCCC';
      if (value < 0.1) return '#ADD8E6';
      if (value < 0.5) return '#4169E1';
      if (value < 1.0) return '#0000CD';
      return '#00008B';
    } else {
      // Snow: white (none) to dark blue (heavy)
      if (value === 0) return '#CCCCCC';
      if (value < 1) return '#E0F0FF';
      if (value < 5) return '#87CEEB';
      if (value < 10) return '#4169E1';
      return '#0000CD';
    }
  };

  const color = getColor(avgValue);
  
  const getMetricLabel = (): string => {
    switch (metric) {
      case 'tmax': return 'Avg High';
      case 'tmin': return 'Avg Low';
      case 'prcp': return 'Avg Precipitation';
      case 'snow': return 'Avg Snowfall';
      default: return 'Average';
    }
  };

  const getMetricUnit = (): string => {
    return metric === 'prcp' || metric === 'snow' ? 'in' : '°F';
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '600px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <MapContainer
        center={[selectedStation.lat, selectedStation.lon]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Tile Layer - Dark or Light */}
        {darkMode ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        
        {/* Recenter when station changes */}
        <RecenterMap lat={selectedStation.lat} lon={selectedStation.lon} />
        
        {/* Station Marker */}
        <CircleMarker
          center={[selectedStation.lat, selectedStation.lon]}
          radius={8}
          fillColor={color}
          color={darkMode ? '#fff' : '#000'}
          weight={2}
          opacity={1}
          fillOpacity={0.8}
        >
          <Popup>
            <div style={{ 
              fontFamily: 'Arial', 
              minWidth: '200px',
              color: '#333'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                {selectedStation.station_id}
              </h4>
              <p style={{ margin: '0 0 5px 0', fontWeight: 600 }}>
                {selectedStation.name}
              </p>
              <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
              <p style={{ margin: '0', fontSize: '15px' }}>
                <strong>{getMetricLabel()}:</strong>{' '}
                {avgValue !== null 
                  ? `${avgValue.toFixed(1)}${getMetricUnit()}`
                  : 'No data'
                }
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                Based on {data.length} day{data.length !== 1 ? 's' : ''} of data
              </p>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
      
      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: darkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)',
        color: darkMode ? '#ecf0f1' : '#2c3e50',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        fontSize: '13px',
        minWidth: '150px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>
          Legend
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: color,
            marginRight: '10px',
            border: `2px solid ${darkMode ? '#fff' : '#000'}`
          }} />
          <span>{selectedStation.station_id}</span>
        </div>
        {avgValue !== null && (
          <div style={{ 
            marginTop: '10px', 
            paddingTop: '10px', 
            borderTop: `1px solid ${darkMode ? '#444' : '#ddd'}`,
            fontSize: '12px'
          }}>
            {getMetricLabel()}: {avgValue.toFixed(1)}{getMetricUnit()}
          </div>
        )}
      </div>
    </div>
  );
}