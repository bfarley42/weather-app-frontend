// src/components/WindModal.tsx
/**
 * Modal for displaying hourly wind speed breakdown
 * - Line chart showing wind speed with gust markers
 * - Summary cards: average, current, max gust
 * - Toggle for 24h vs Today only view
 * - Cyan/teal color scheme for wind
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wind } from 'lucide-react';
import WindChart from './WindChart';
import { API_URL } from '../config';
import { observationClock } from '../utils/observationClock';
import './WindModal.css';

interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  avg_wspd_mph: number | null;
  max_gust_mph: number | null;
}

interface WindModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentWind?: number | null;
  currentGust?: number | null;
  filterDate?: string;  // NEW - optional date like "2026-02-08"
  timezone?: string;
}

export default function WindModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  currentWind,
  filterDate,
  timezone,
//   currentGust,
}: WindModalProps) {
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
      // Use date-specific endpoint if filterDate provided
      const url = filterDate
        ? `${API_URL}/api/weather/hourly-day?station=${stationId}&date=${filterDate}`
        : `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`;
      
      const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        if (filterDate && (!Array.isArray(data) || data.some((hour: HourlyData) => hour.ts_local.slice(0, 10) !== filterDate))) {
          throw new Error('Hourly observations do not match the selected date');
        }
        setHourlyData(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [isOpen, stationId, filterDate, attempt]);

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
      return { avgWind: 0, maxGust: 0, maxGustTime: null, calmHours: 0, breezyHours: 0, windyHours: 0 };
    }

    const winds = data.map(h => h.avg_wspd_mph).filter((w): w is number => w !== null);
    // const gusts = data.map(h => h.max_gust_mph).filter((g): g is number => g !== null && g > 0);
    
    const avgWind = winds.length > 0 
      ? winds.reduce((sum, w) => sum + w, 0) / winds.length 
      : 0;
    
    // Find max gust and its time
    let maxGust = 0;
    let maxGustTime: Date | null = null;
    data.forEach(h => {
      if (h.max_gust_mph && h.max_gust_mph > maxGust) {
        maxGust = h.max_gust_mph;
        maxGustTime = new Date(h.ts_local);
      }
    });

    // Categorize hours
    let calmHours = 0;
    let breezyHours = 0;
    let windyHours = 0;
    
    data.forEach(h => {
      if (filterDate && h.avg_wspd_mph == null) return;
      const wind = h.avg_wspd_mph ?? 0;
      if (wind < 5) calmHours++;
      else if (wind < 15) breezyHours++;
      else windyHours++;
    });

    return {
      avgWind: Math.round(avgWind),
      maxGust: Math.round(maxGust),
      maxGustTime,
      calmHours,
      breezyHours,
      windyHours,
    };
  };

  const summary = calculateSummary(filteredData);
  const historicalWinds = filteredData.map(h => h.avg_wspd_mph).filter((value): value is number => value != null);
  const historicalGusts = filteredData.filter(h => h.max_gust_mph != null);
  const historicalMaxGust = historicalGusts.reduce<HourlyData | null>((max, hour) =>
    !max || hour.max_gust_mph! > max.max_gust_mph! ? hour : max, null);
  const historicalMaximum = historicalWinds.length ? Math.round(Math.max(...historicalWinds)) : '--';

  // Format time for max gust
  const formatGustTime = (date: Date | null): string => {
    if (!date) return '--';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const modalContent = (
    <div 
      className={`wind-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="wind-modal">
        <button 
          className="wind-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="wind-modal-handle" />

        <div className="wind-modal-content">
          {loading ? (
            <div className="wind-modal-loading">
              <div className="loading-spinner" />
              <span>Loading wind data...</span>
            </div>
          ) : error ? (
            <div className="wind-modal-error">
              <span>⚠️ {error}</span>
              {filterDate && <button onClick={() => setAttempt(value => value + 1)}>Retry</button>}
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="wind-modal-loading">
              <span>No data available</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="wind-modal-header">
                <h2 className="wind-modal-title">{stationName}</h2>
                <div className="wind-modal-subtitle">
                  {filterDate ? `${filterDate} (${timezone}) Wind` : showTodayOnly ? "Today's Wind" : 'Last 24 Hours Wind'}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="wind-summary-cards">
                {/* Average Wind */}
                <div className="wind-summary-card">
                  <Wind size={20} className="wind-card-icon" />
                  <div className="wind-card-value">
                    {filterDate && !historicalWinds.length ? '--' : summary.avgWind}
                    <span className="wind-card-unit">mph</span>
                  </div>
                  <div className="wind-card-label">Average</div>
                </div>

                {/* Current Wind */}
                <div className="wind-summary-card current">
                  <Wind size={20} className="wind-card-icon" />
                  <div className="wind-card-value">
                    {filterDate ? historicalMaximum : currentWind !== null && currentWind !== undefined ? Math.round(currentWind) : '--'}
                    <span className="wind-card-unit">mph</span>
                  </div>
                  <div className="wind-card-label">{filterDate ? 'Maximum' : 'Current'}</div>
                </div>

                {/* Max Gust */}
                <div className="wind-summary-card gust">
                  <Wind size={20} className="wind-card-icon gust-icon" />
                  <div className="wind-card-value">
                    {filterDate ? historicalMaxGust ? Math.round(historicalMaxGust.max_gust_mph!) : '--' : summary.maxGust > 0 ? summary.maxGust : '--'}
                    <span className="wind-card-unit">mph</span>
                  </div>
                  <div className="wind-card-label">Max Gust</div>
                  {(filterDate ? historicalMaxGust : summary.maxGustTime) && (
                    <div className="wind-card-time">{filterDate && historicalMaxGust ? observationClock(historicalMaxGust.ts_local, timezone || 'America/New_York').time : formatGustTime(summary.maxGustTime)}</div>
                  )}
                </div>
              </div>

              {/* Breakdown */}
              <div className="wind-breakdown">
                <div className="wind-breakdown-item">
                  <span className="wind-breakdown-value">{summary.calmHours}</span>
                  <span className="wind-breakdown-label">calm hrs</span>
                </div>
                <div className="wind-breakdown-divider" />
                <div className="wind-breakdown-item">
                  <span className="wind-breakdown-value">{summary.breezyHours}</span>
                  <span className="wind-breakdown-label">breezy</span>
                </div>
                <div className="wind-breakdown-divider" />
                <div className="wind-breakdown-item">
                  <span className="wind-breakdown-value">{summary.windyHours}</span>
                  <span className="wind-breakdown-label">windy</span>
                </div>
              </div>

              {/* Chart */}
              <WindChart
                data={filteredData}
                darkMode={darkMode}
                showTodayOnly={showTodayOnly}
                filterDate={filterDate}
                timezone={timezone}
              />

              {/* Toggle */}
              <div className="wind-toggle-container">
                <button
                  className={`wind-toggle-btn ${showTodayOnly ? 'active' : ''}`}
                  onClick={() => setShowTodayOnly(!showTodayOnly)}
                  disabled={!!filterDate}
                >
                  <span className="toggle-label">{filterDate ? 'Selected day' : 'Today Only'}</span>
                  <div className={`toggle-switch ${showTodayOnly ? 'on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </button>
              </div>

              {/* Legend */}
              <div className="wind-legend">
                <div className="legend-item">
                  <div className="legend-line wind-line" />
                  <span>Wind Speed</span>
                </div>
                <div className="legend-item">
                  <div className="legend-diamond" />
                  <span>Gusts</span>
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
