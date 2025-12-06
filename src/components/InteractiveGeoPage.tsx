// src/pages/InteractiveGeoPage.tsx
/**
 * Example page for Interactive Geographic Timeline
 * Shows how to integrate the component with controls
 */

import { useState } from 'react';
import InteractiveGeoTimeline from '../components/InteractiveGeoTimeline';

// Recommended Michigan stations with good coverage
const MICHIGAN_STATIONS = [
  { id: 'KDTW', name: 'Detroit Metro', region: 'SE' },
  { id: 'KPTK', name: 'Pontiac', region: 'SE' },
  { id: 'KGRR', name: 'Grand Rapids', region: 'SW' },
  { id: 'KMKG', name: 'Muskegon', region: 'SW' },
  { id: 'KLAN', name: 'Lansing', region: 'C' },
  { id: 'KFNT', name: 'Flint', region: 'C' },
  { id: 'KTVC', name: 'Traverse City', region: 'NW' },
  { id: 'KPLN', name: 'Pellston', region: 'NW' },
  { id: 'KAPN', name: 'Alpena', region: 'NE' },
  { id: 'KOSC', name: 'Oscoda', region: 'NE' },
  { id: 'KESC', name: 'Escanaba', region: 'UP' },
  { id: 'KCMX', name: 'Houghton', region: 'UP' },
  { id: 'KMQT', name: 'Marquette', region: 'UP' },
  { id: 'KIWD', name: 'Ironwood', region: 'UP' },
  { id: 'KSAW', name: 'Sawyer', region: 'UP' },
];

interface InteractiveGeoPageProps {
  darkMode?: boolean;
}

export default function InteractiveGeoPage({ darkMode = false }: InteractiveGeoPageProps) {
  const [metric, setMetric] = useState<'snow' | 'rain' | 'hot_days' | 'freeze_days'>('snow');
  const [selectedStations, setSelectedStations] = useState<string[]>(
    MICHIGAN_STATIONS.slice(0, 10).map(s => s.id) // Start with 10 stations
  );
  const [dateRange, setDateRange] = useState({
    start: '2024-12-01',
    end: '2025-02-28'
  });

  const handleStationToggle = (stationId: string) => {
    setSelectedStations(prev => 
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStations(MICHIGAN_STATIONS.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStations([]);
  };

  const handleMetricChange = (newMetric: 'snow' | 'rain' | 'hot_days' | 'freeze_days') => {
    setMetric(newMetric);
    
    // Auto-adjust date range
    if (newMetric === 'snow' || newMetric === 'freeze_days') {
      setDateRange({ start: '2024-12-01', end: '2025-02-28' });
    } else if (newMetric === 'hot_days') {
      setDateRange({ start: '2024-06-01', end: '2024-08-31' });
    } else {
      setDateRange({ start: '2024-05-01', end: '2024-09-30' });
    }
  };

  return (
    <div style={{ 
      padding: '20px',
      background: darkMode ? '#0f0f1e' : '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: darkMode ? '#ecf0f1' : '#2c3e50',
          marginBottom: '10px'
        }}>
          Interactive Weather Timeline
        </h1>
        <p style={{
          fontSize: '16px',
          color: darkMode ? '#95a5a6' : '#7f8c8d',
          maxWidth: '700px',
          margin: '0 auto'
        }}>
          Position stations on the map, then watch weather metrics accumulate over time with growing bars
        </p>
      </div>

      {/* Controls */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 30px',
        padding: '20px',
        background: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Metric Selector */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: darkMode ? '#ecf0f1' : '#2c3e50',
            marginBottom: '12px'
          }}>
            Select Metric
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {[
              { value: 'snow', label: '❄️ Snow', desc: 'Winter accumulation' },
              { value: 'rain', label: '🌧️ Rain', desc: 'Precipitation' },
              { value: 'hot_days', label: '🌡️ Hot Days', desc: '90°+ days' },
              { value: 'freeze_days', label: '🥶 Freeze Days', desc: 'Below 32°' }
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => handleMetricChange(value as any)}
                style={{
                  padding: '12px 20px',
                  background: metric === value
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : (darkMode ? 'rgba(52, 73, 94, 0.3)' : 'rgba(0, 0, 0, 0.04)'),
                  color: metric === value 
                    ? '#fff' 
                    : (darkMode ? '#95a5a6' : '#666'),
                  border: metric === value
                    ? 'none'
                    : `1px solid ${darkMode ? 'rgba(149, 165, 166, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: metric === value ? 700 : 500,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxShadow: metric === value
                    ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                    : 'none'
                }}
              >
                {label}
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: darkMode ? '#ecf0f1' : '#2c3e50',
            marginBottom: '12px'
          }}>
            Date Range
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: darkMode ? '#95a5a6' : '#7f8c8d',
                marginBottom: '4px'
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${darkMode ? '#34495e' : '#ddd'}`,
                  background: darkMode ? '#2c3e50' : '#fff',
                  color: darkMode ? '#ecf0f1' : '#2c3e50',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: darkMode ? '#95a5a6' : '#7f8c8d',
                marginBottom: '4px'
              }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${darkMode ? '#34495e' : '#ddd'}`,
                  background: darkMode ? '#2c3e50' : '#fff',
                  color: darkMode ? '#ecf0f1' : '#2c3e50',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Station Selector */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: darkMode ? '#ecf0f1' : '#2c3e50'
            }}>
              Stations ({selectedStations.length}/{MICHIGAN_STATIONS.length})
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: darkMode ? '#3498db' : '#2980b9',
                  border: `1px solid ${darkMode ? '#3498db' : '#2980b9'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: darkMode ? '#e74c3c' : '#c0392b',
                  border: `1px solid ${darkMode ? '#e74c3c' : '#c0392b'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Clear
              </button>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '8px'
          }}>
            {MICHIGAN_STATIONS.map(station => (
              <label
                key={station.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: selectedStations.includes(station.id)
                    ? (darkMode ? 'rgba(52, 152, 219, 0.2)' : 'rgba(52, 152, 219, 0.1)')
                    : (darkMode ? 'rgba(52, 73, 94, 0.3)' : 'rgba(0, 0, 0, 0.02)'),
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: `1px solid ${
                    selectedStations.includes(station.id)
                      ? (darkMode ? '#3498db' : '#2980b9')
                      : (darkMode ? '#34495e' : '#ddd')
                  }`,
                  transition: 'all 0.2s',
                  fontSize: '13px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedStations.includes(station.id)}
                  onChange={() => handleStationToggle(station.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{
                  color: darkMode ? '#ecf0f1' : '#2c3e50',
                  fontWeight: 500,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {station.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {selectedStations.length > 0 ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <InteractiveGeoTimeline
            region="michigan"
            metric={metric}
            startDate={dateRange.start}
            endDate={dateRange.end}
            stationIds={selectedStations}
            darkMode={darkMode}
            onStationsPositioned={(positions) => {
              console.log('Stations positioned:', positions);
            }}
          />
        </div>
      ) : (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 20px',
          textAlign: 'center',
          background: darkMode ? '#1a1a2e' : '#ffffff',
          borderRadius: '12px',
          color: darkMode ? '#95a5a6' : '#7f8c8d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
          <h3 style={{ 
            fontSize: '20px', 
            marginBottom: '10px',
            color: darkMode ? '#ecf0f1' : '#2c3e50'
          }}>
            Select stations to begin
          </h3>
          <p>Choose at least one station from the list above to create your visualization</p>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        maxWidth: '1200px',
        margin: '30px auto 0',
        padding: '20px',
        background: darkMode ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.08)',
        borderLeft: `4px solid ${darkMode ? '#3498db' : '#2980b9'}`,
        borderRadius: '4px',
        fontSize: '14px',
        color: darkMode ? '#ecf0f1' : '#2c3e50'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontWeight: 600 }}>How to Use:</h4>
        <ol style={{ margin: '0 0 0 20px', padding: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Select stations</strong> - Choose 5-15 stations for best results
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Position them</strong> - Drag stations on the map to space them out
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Start animation</strong> - Click "Start Animation" to watch bars grow
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Control timeline</strong> - Use play/pause and slider to navigate
          </li>
          <li>
            <strong>Edit anytime</strong> - Click "Edit Positions" to reposition stations
          </li>
        </ol>
      </div>
    </div>
  );
}