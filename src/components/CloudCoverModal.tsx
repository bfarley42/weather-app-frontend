// src/components/CloudCoverModal.tsx
/**
 * Modal for displaying hourly cloud cover breakdown
 * - Bar chart showing cloud cover percentage per hour
 * - Divider between yesterday and today
 * - Toggle for 24h vs Today only view
 * - Mirrors SunshineModal design with grayish-blue theme
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cloud } from 'lucide-react';
import CloudCoverChart from './CloudCoverChart';
import { API_URL } from '../config';
import { historicalCloudSummary } from '../utils/historicalCloudCover';
import './CloudCoverModal.css';

interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  skyc1: string | null;
  wxcodes: string | null;
  precip_in: number | null;
}

interface CloudCoverModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  filterDate?: string;  // NEW - optional date like "2026-02-08"
  timezone?: string;
}

export default function CloudCoverModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  filterDate,
  timezone,
}: CloudCoverModalProps) {
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
        if (filterDate && (!Array.isArray(data) || data.some((hour: HourlyData) =>
          !hour || typeof hour.ts_local !== 'string' || hour.ts_local.slice(0, 10) !== filterDate ||
          (hour.skyc1 != null && typeof hour.skyc1 !== 'string')))) {
          throw new Error('Hourly observations do not match the selected date or sky format');
        }
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
      return { avgCloudCover: 0, clearHours: 0, cloudyHours: 0, overcastHours: 0 };
    }

    const skyToCloudPct = (skyCode: string | null): number => {
      if (!skyCode) return 50;
      const code = skyCode.toUpperCase();
      switch (code) {
        case 'CLR':
        case 'SKC': return 0;
        case 'FEW': return 18;
        case 'SCT': return 44;
        case 'BKN': return 75;
        case 'OVC': return 100;
        default: return 50;
      }
    };

    let totalCloudCover = 0;
    let clearHours = 0;
    let cloudyHours = 0;
    let overcastHours = 0;

    data.forEach(hour => {
      const cloudPct = skyToCloudPct(hour.skyc1);
      totalCloudCover += cloudPct;
      
      if (cloudPct <= 25) clearHours++;
      else if (cloudPct <= 75) cloudyHours++;
      else overcastHours++;
    });

    return {
      avgCloudCover: Math.round(totalCloudCover / data.length),
      clearHours,
      cloudyHours,
      overcastHours,
    };
  };

  const historicalSummary = filterDate ? historicalCloudSummary(filteredData) : null;
  const summary = historicalSummary ?? calculateSummary(filteredData);

  const modalContent = (
    <div 
      className={`cloudcover-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cloudcover-modal">
        <button 
          className="cloudcover-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="cloudcover-modal-handle" />

        <div className="cloudcover-modal-content">
          {loading ? (
            <div className="cloudcover-modal-loading">
              <div className="loading-spinner" />
              <span>Loading cloud data...</span>
            </div>
          ) : error ? (
            <div className="cloudcover-modal-error">
              <span>⚠️ {error}</span>
              {filterDate && <button onClick={() => setAttempt(value => value + 1)}>Retry</button>}
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="cloudcover-modal-loading">
              <span>No data available</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="cloudcover-header">
                <h2 className="cloudcover-title">{stationName}</h2>
                <div className="cloudcover-subtitle">
                  {filterDate ? `${filterDate} (${timezone || 'station local time'}) Cloud Cover` : showTodayOnly ? "Today's Cloud Cover" : 'Last 24 Hours Cloud Cover'}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="cloudcover-summary">
                <div className="cloudcover-stat-main">
                  <Cloud size={32} className="cloudcover-icon" />
                  <span className="cloudcover-pct">{summary.avgCloudCover ?? '--'}</span>
                  <span className="cloudcover-pct-symbol">%</span>
                </div>
                <div className="cloudcover-stat-secondary">
                  <span className="cloudcover-label">{filterDate ? 'estimated average cloud cover' : 'average cloud cover'}</span>
                </div>
                <div className="cloudcover-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-value">{summary.clearHours}</span>
                    <span className="breakdown-label">clear hrs</span>
                  </div>
                  <div className="breakdown-divider" />
                  <div className="breakdown-item">
                    <span className="breakdown-value">{summary.cloudyHours}</span>
                    <span className="breakdown-label">partly cloudy</span>
                  </div>
                  <div className="breakdown-divider" />
                  <div className="breakdown-item">
                    <span className="breakdown-value">{summary.overcastHours}</span>
                    <span className="breakdown-label">overcast</span>
                  </div>
                </div>
              </div>

              {historicalSummary && <p className="cloudcover-subtitle" role="status">
                Estimated from sky categories; {historicalSummary.observedCount}/{filteredData.length} hourly records have known sky cover.
                {' Missing or unknown sky codes are excluded. Observation completeness is not guaranteed.'}
              </p>}

              {/* Chart */}
              <CloudCoverChart
                data={filteredData}
                darkMode={darkMode}
                showTodayOnly={showTodayOnly}
                filterDate={filterDate}
                timezone={timezone}
              />

              {/* Toggle */}
              <div className="cloudcover-toggle-container">
                <button
                  className={`cloudcover-toggle-btn ${showTodayOnly ? 'active' : ''}`}
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
              <div className="cloudcover-legend">
                <div className="legend-item">
                  <div className="legend-color clear-color" />
                  <span>Clear</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color partly-color" />
                  <span>Partly Cloudy</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color overcast-color" />
                  <span>Overcast</span>
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
