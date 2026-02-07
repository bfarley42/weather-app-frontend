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
}

export default function CloudCoverModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
}: CloudCoverModalProps) {
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
        const response = await fetch(
          `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`
        );

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
  }, [isOpen, stationId]);

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

  const summary = calculateSummary(filteredData);

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
                  {showTodayOnly ? "Today's Cloud Cover" : 'Last 24 Hours Cloud Cover'}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="cloudcover-summary">
                <div className="cloudcover-stat-main">
                  <Cloud size={32} className="cloudcover-icon" />
                  <span className="cloudcover-pct">{summary.avgCloudCover}</span>
                  <span className="cloudcover-pct-symbol">%</span>
                </div>
                <div className="cloudcover-stat-secondary">
                  <span className="cloudcover-label">average cloud cover</span>
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

              {/* Chart */}
              <CloudCoverChart
                data={filteredData}
                darkMode={darkMode}
                showTodayOnly={showTodayOnly}
              />

              {/* Toggle */}
              <div className="cloudcover-toggle-container">
                <button
                  className={`cloudcover-toggle-btn ${showTodayOnly ? 'active' : ''}`}
                  onClick={() => setShowTodayOnly(!showTodayOnly)}
                >
                  <span className="toggle-label">Today Only</span>
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