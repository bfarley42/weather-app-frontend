// src/components/DewPointModal.tsx
/**
 * Modal for displaying hourly dew point breakdown
 * - Line chart showing dew point temperature
 * - Summary cards: average, current, high/low
 * - Toggle for 24h vs Today only view
 * - Teal/green color scheme
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Thermometer } from 'lucide-react';
import DewPointChart from './DewPointChart';
import { API_URL } from '../config';
import './DewPointModal.css';

interface HourlyData {
  ts_local: string;
  dwpf: number | null;
  tmpf: number | null;
}

interface DewPointModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentDewPoint?: number | null;
  filterDate?: string;  // NEW - optional date like "2026-02-08"
}

export default function DewPointModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  currentDewPoint,
  filterDate,
}: DewPointModalProps) {
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
      return { avgDewPoint: 0, highDewPoint: 0, lowDewPoint: 0, highTime: null, lowTime: null };
    }

    const dewPoints = data.map(h => h.dwpf).filter((d): d is number => d !== null);
    
    const avgDewPoint = dewPoints.length > 0 
      ? dewPoints.reduce((sum, d) => sum + d, 0) / dewPoints.length 
      : 0;
    
    // Find high and low with times
    let highDewPoint = -100;
    let lowDewPoint = 200;
    let highTime: Date | null = null;
    let lowTime: Date | null = null;
    
    data.forEach(h => {
      if (h.dwpf !== null) {
        if (h.dwpf > highDewPoint) {
          highDewPoint = h.dwpf;
          highTime = new Date(h.ts_local);
        }
        if (h.dwpf < lowDewPoint) {
          lowDewPoint = h.dwpf;
          lowTime = new Date(h.ts_local);
        }
      }
    });

    return {
      avgDewPoint: Math.round(avgDewPoint),
      highDewPoint: Math.round(highDewPoint),
      lowDewPoint: Math.round(lowDewPoint),
      highTime,
      lowTime,
    };
  };

  const summary = calculateSummary(filteredData);

  // Get comfort level description based on dew point
  const getComfortLevel = (dewPoint: number): { label: string; color: string; description: string } => {
    if (dewPoint < 50) return { label: 'Dry', color: '#3a5c46', description: 'Pleasant, comfortable' };
    if (dewPoint < 55) return { label: 'Comfortable', color: '#505a40', description: 'Comfortable for most' };
    if (dewPoint < 60) return { label: 'Slightly Humid', color: '#eab308', description: 'Slightly noticeable' };
    if (dewPoint < 65) return { label: 'Humid', color: '#f97316', description: 'Sticky, uncomfortable' };
    if (dewPoint < 70) return { label: 'Very Humid', color: '#ef4444', description: 'Very uncomfortable' };
    return { label: 'Oppressive', color: '#dc2626', description: 'Dangerous for some' };
  };

  const comfort = currentDewPoint !== null && currentDewPoint !== undefined 
    ? getComfortLevel(currentDewPoint) 
    : getComfortLevel(summary.avgDewPoint);

  const modalContent = (
    <div 
      className={`dewpoint-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dewpoint-modal">
        <button 
          className="dewpoint-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="dewpoint-modal-handle" />

        <div className="dewpoint-modal-content">
          {loading ? (
            <div className="dewpoint-modal-loading">
              <div className="loading-spinner" />
              <span>Loading dew point data...</span>
            </div>
          ) : error ? (
            <div className="dewpoint-modal-error">
              <span>⚠️ {error}</span>
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="dewpoint-modal-loading">
              <span>No data available</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="dewpoint-modal-header">
                <h2 className="dewpoint-modal-title">{stationName}</h2>
                <div className="dewpoint-modal-subtitle">
                  {showTodayOnly ? "Today's Dew Point" : 'Last 24 Hours Dew Point'}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="dewpoint-summary-cards">
                {/* Average */}
                <div className="dewpoint-summary-card">
                  <Thermometer size={20} className="dewpoint-card-icon" />
                  <div className="dewpoint-card-value">
                    {summary.avgDewPoint}
                    <span className="dewpoint-card-unit">°F</span>
                  </div>
                  <div className="dewpoint-card-label">Average</div>
                </div>

                {/* Current */}
                <div className="dewpoint-summary-card current">
                  <Thermometer size={20} className="dewpoint-card-icon" />
                  <div className="dewpoint-card-value">
                    {currentDewPoint !== null && currentDewPoint !== undefined ? Math.round(currentDewPoint) : '--'}
                    <span className="dewpoint-card-unit">°F</span>
                  </div>
                  <div className="dewpoint-card-label">Current</div>
                  <div className="dewpoint-card-comfort" style={{ color: comfort.color }}>
                    {comfort.label}
                  </div>
                </div>

                {/* High/Low */}
                <div className="dewpoint-summary-card range">
                  <div className="dewpoint-range-row">
                    <span className="dewpoint-range-label">H:</span>
                    <span className="dewpoint-range-value high">{summary.highDewPoint}°</span>
                  </div>
                  <div className="dewpoint-range-row">
                    <span className="dewpoint-range-label">L:</span>
                    <span className="dewpoint-range-value low">{summary.lowDewPoint}°</span>
                  </div>
                  <div className="dewpoint-card-label">Range</div>
                </div>
              </div>

              {/* Chart */}
              <DewPointChart
                data={filteredData}
                darkMode={darkMode}
                showTodayOnly={showTodayOnly}
              />

              {/* Toggle */}
              <div className="dewpoint-toggle-container">
                <button
                  className={`dewpoint-toggle-btn ${showTodayOnly ? 'active' : ''}`}
                  onClick={() => setShowTodayOnly(!showTodayOnly)}
                >
                  <span className="toggle-label">Today Only</span>
                  <div className={`toggle-switch ${showTodayOnly ? 'on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </button>
              </div>

              {/* Comfort Scale */}
              <div className="dewpoint-comfort-scale">
                <div className="comfort-item dry">
                  <span className="comfort-range">&lt;50°</span>
                  <span className="comfort-label">Dry</span>
                </div>
                <div className="comfort-item comfortable">
                  <span className="comfort-range">50-55°</span>
                  <span className="comfort-label">Comfy</span>
                </div>
                <div className="comfort-item slight">
                  <span className="comfort-range">55-60°</span>
                  <span className="comfort-label">Slight</span>
                </div>
                <div className="comfort-item humid">
                  <span className="comfort-range">60-65°</span>
                  <span className="comfort-label">Humid</span>
                </div>
                <div className="comfort-item very-humid">
                  <span className="comfort-range">&gt;65°</span>
                  <span className="comfort-label">Muggy</span>
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