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
}: HumidityModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  // Fetch hourly data when modal opens
  useEffect(() => {
    if (!isOpen || !stationId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
      // Use date-specific endpoint if filterDate provided
      const url = filterDate
        ? `${API_URL}/api/weather/hourly-day?station=${stationId}&date=${filterDate}`
        : `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`;
      
      const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        setHourlyData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOpen, stationId, filterDate]);

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
  
  const filteredData = showTodayOnly
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

  const summary = calculateSummary(filteredData);

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

  const comfort = getComfortLevel(summary.avgHumidity);

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
                  {showTodayOnly ? "Today's Humidity" : 'Last 24 Hours Humidity'}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="humidity-summary-cards">
                {/* Average */}
                <div className="humidity-summary-card">
                  <Droplets size={20} className="humidity-card-icon" />
                  <div className="humidity-card-value">
                    {summary.avgHumidity}
                    <span className="humidity-card-unit">%</span>
                  </div>
                  <div className="humidity-card-label">Average</div>
                </div>

                {/* Current */}
                <div className="humidity-summary-card current">
                  <Droplets size={20} className="humidity-card-icon" />
                  <div className="humidity-card-value">
                    {currentHumidity !== null && currentHumidity !== undefined ? Math.round(currentHumidity) : '--'}
                    <span className="humidity-card-unit">%</span>
                  </div>
                  <div className="humidity-card-label">Current</div>
                  <div className="humidity-card-comfort" style={{ color: comfort.color }}>
                    {comfort.label}
                  </div>
                </div>

                {/* High/Low */}
                <div className="humidity-summary-card range">
                  <div className="humidity-range-row">
                    <span className="humidity-range-label">H:</span>
                    <span className="humidity-range-value high">{summary.highHumidity}%</span>
                  </div>
                  <div className="humidity-range-row">
                    <span className="humidity-range-label">L:</span>
                    <span className="humidity-range-value low">{summary.lowHumidity}%</span>
                  </div>
                  <div className="humidity-card-label">Range</div>
                </div>
              </div>

              {/* Chart */}
              <HumidityChart
                data={filteredData}
                darkMode={darkMode}
                showTodayOnly={showTodayOnly}
              />

              {/* Toggle */}
              <div className="humidity-toggle-container">
                <button
                  className={`humidity-toggle-btn ${showTodayOnly ? 'active' : ''}`}
                  onClick={() => setShowTodayOnly(!showTodayOnly)}
                >
                  <span className="toggle-label">Today Only</span>
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