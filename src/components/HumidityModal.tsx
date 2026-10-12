// src/components/HumidityModal.tsx
/**
 * Modal for displaying hourly humidity breakdown
 * - Line chart showing relative humidity percentage
 * - Summary cards: average, current, high/low
 * - Toggle for 24h vs Today only view
 * - Blue/purple color scheme
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Droplets } from 'lucide-react';
import HumidityChart from './HumidityChart';
import { API_URL } from '../config';
import { fetchHistoricalMoisture } from '../api/historicalMoisture';
import { moistureStatistics, type HourlyMoisture } from '../utils/historicalMoisture';
import './HumidityModal.css';

interface HourlyData {
  ts_local: string;
  relh_pct: number | null;
}

interface HumidityModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentHumidity?: number | null;
  timezone?: string;
  onHistoricalData?: (rows: HourlyMoisture[]) => void;
  filterDate?: string;  // NEW - optional date like "2026-02-08"
}

export default function HumidityModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  currentHumidity,
  filterDate,
  timezone,
  onHistoricalData,
}: HumidityModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Fetch hourly data when modal opens
  useEffect(() => {
    if (!isOpen || !stationId) return;
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        if (filterDate) {
          const rows = await fetchHistoricalMoisture(stationId, filterDate, controller.signal);
          if (!controller.signal.aborted) {
            setHourlyData(rows);
            onHistoricalData?.(rows);
          }
          return;
        }
      // Use date-specific endpoint if filterDate provided
      const url = filterDate
        ? `${API_URL}/api/weather/hourly-day?station=${stationId}&date=${filterDate}`
        : `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`;
      
      const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        if (!controller.signal.aborted) setHourlyData(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [isOpen, stationId, filterDate, attempt, onHistoricalData]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter data for today only if toggle is on
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const filteredData = !filterDate && showTodayOnly
    ? hourlyData.filter(h => {
        const hourDate = new Date(h.ts_local);
        hourDate.setHours(0, 0, 0, 0);
        return hourDate.getTime() === today.getTime();
      })
    : hourlyData;

  // Calculate summary stats
  const calculateSummary = (data: HourlyData[]) => {
    if (!data.length) {
      return { avgHumidity: 0, highHumidity: 0, lowHumidity: 0, highTime: null, lowTime: null };
    }

    const humidities = data.map(h => h.relh_pct).filter((h): h is number => h !== null);
    
    const avgHumidity = humidities.length > 0 
      ? humidities.reduce((sum, h) => sum + h, 0) / humidities.length 
      : 0;
    
    // Find high and low with times
    let highHumidity = 0;
    let lowHumidity = 100;
    let highTime: Date | null = null;
    let lowTime: Date | null = null;
    
    data.forEach(h => {
      if (h.relh_pct !== null) {
        if (h.relh_pct > highHumidity) {
          highHumidity = h.relh_pct;
          highTime = new Date(h.ts_local);
        }
        if (h.relh_pct < lowHumidity) {
          lowHumidity = h.relh_pct;
          lowTime = new Date(h.ts_local);
        }
      }
    });

    return {
      avgHumidity: Math.round(avgHumidity),
      highHumidity: Math.round(highHumidity),
      lowHumidity: Math.round(lowHumidity),
      highTime,
      lowTime,
    };
  };

  const historicalStats = filterDate ? moistureStatistics(filteredData as HourlyMoisture[], 'relh_pct') : null;
  const summary = historicalStats ? {
    avgHumidity: historicalStats.average == null ? null : Math.round(historicalStats.average),
    highHumidity: historicalStats.high == null ? null : Math.round(historicalStats.high),
    lowHumidity: historicalStats.low == null ? null : Math.round(historicalStats.low),
  } : calculateSummary(filteredData);

  // Format time
//   const formatTime = (date: Date | null): string => {
//     if (!date) return '--';
//     return date.toLocaleTimeString('en-US', { 
//       hour: 'numeric', 
//       minute: '2-digit',
//       hour12: true 
//     });
//   };

  // Get comfort level description
  const getComfortLevel = (humidity: number): { label: string; color: string } => {
    if (humidity < 30) return { label: 'Dry', color: '#f59e0b' };
    if (humidity < 50) return { label: 'Comfortable', color: '#22c55e' };
    if (humidity < 70) return { label: 'Moderate', color: '#3b82f6' };
    return { label: 'Humid', color: '#8b5cf6' };
  };

  const comfortValue = filterDate ? summary.highHumidity : summary.avgHumidity;
  const comfort = comfortValue == null ? { label: '--', color: '#666' } : getComfortLevel(comfortValue);

  const modalContent = (
    <div 
      className={`humidity-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="humidity-modal">
        <button 
          className="humidity-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="humidity-modal-handle" />

        <div className="humidity-modal-content">
          {loading ? (
            <div className="humidity-modal-loading">
              <div className="loading-spinner" />
              <span>Loading humidity data...</span>
            </div>
          ) : error ? (
            <div className="humidity-modal-error">
              <span>⚠️ {error}</span>
              {filterDate && <button onClick={() => setAttempt(value => value + 1)}>Retry</button>}
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="humidity-modal-loading">
              <span>No data available</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="humidity-modal-header">
                <h2 className="humidity-modal-title">{stationName}</h2>
                <div className="humidity-modal-subtitle">
                  {filterDate ? `${filterDate} (${timezone || 'station local time'}) Humidity` : showTodayOnly ? "Today's Humidity" : 'Last 24 Hours Humidity'}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="humidity-summary-cards">
                {/* Average */}
                <div className="humidity-summary-card">
                  <Droplets size={20} className="humidity-card-icon" />
                  <div className="humidity-card-value">
                    {summary.avgHumidity ?? '--'}
                    <span className="humidity-card-unit">%</span>
                  </div>
                  <div className="humidity-card-label">Average</div>
                </div>

                {/* Current */}
                <div className="humidity-summary-card current">
                  <Droplets size={20} className="humidity-card-icon" />
                  <div className="humidity-card-value">
                    {filterDate ? summary.highHumidity ?? '--' : currentHumidity !== null && currentHumidity !== undefined ? Math.round(currentHumidity) : '--'}
                    <span className="humidity-card-unit">%</span>
                  </div>
                  <div className="humidity-card-label">{filterDate ? 'Maximum' : 'Current'}</div>
                  <div className="humidity-card-comfort" style={{ color: comfort.color }}>
                    {comfort.label}
                  </div>
                </div>

                {/* High/Low */}
                <div className="humidity-summary-card range">
                  <div className="humidity-range-row">
                    <span className="humidity-range-label">H:</span>
                    <span className="humidity-range-value high">{summary.highHumidity ?? '--'}%</span>
                  </div>
                  <div className="humidity-range-row">
                    <span className="humidity-range-label">L:</span>
                    <span className="humidity-range-value low">{summary.lowHumidity ?? '--'}%</span>
                  </div>
                  <div className="humidity-card-label">Range</div>
                </div>
              </div>

              {historicalStats && <p className="humidity-modal-subtitle" role="status">
                {historicalStats.count}/{filteredData.length} hourly records have humidity readings.
                {' Missing readings are excluded; observation completeness is not guaranteed.'}
              </p>}

              {/* Chart */}
              <HumidityChart
                data={filteredData}
                darkMode={darkMode}
                showTodayOnly={showTodayOnly}
                filterDate={filterDate}
                timezone={timezone}
              />

              {/* Toggle */}
              <div className="humidity-toggle-container">
                <button
                  className={`humidity-toggle-btn ${showTodayOnly ? 'active' : ''}`}
                  onClick={() => setShowTodayOnly(!showTodayOnly)}
                  disabled={!!filterDate}
                >
                  <span className="toggle-label">{filterDate ? 'Selected day' : 'Today Only'}</span>
                  <div className={`toggle-switch ${showTodayOnly ? 'on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </button>
              </div>

              {/* Comfort Scale */}
              <div className="humidity-comfort-scale">
                <div className="comfort-item dry">
                  <span className="comfort-range">&lt;30%</span>
                  <span className="comfort-label">Dry</span>
                </div>
                <div className="comfort-item comfortable">
                  <span className="comfort-range">30-50%</span>
                  <span className="comfort-label">Comfortable</span>
                </div>
                <div className="comfort-item moderate">
                  <span className="comfort-range">50-70%</span>
                  <span className="comfort-label">Moderate</span>
                </div>
                <div className="comfort-item humid">
                  <span className="comfort-range">&gt;70%</span>
                  <span className="comfort-label">Humid</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
