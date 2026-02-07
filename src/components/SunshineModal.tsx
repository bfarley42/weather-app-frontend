// src/components/SunshineModal.tsx
/**
 * Modal for displaying hourly sunshine breakdown
 * - Bar chart showing sunshine factor per hour
 * - Divider between yesterday and today
 * - Toggle for 24h vs Today only view
 * - Nighttime hours shown in gray
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SunshineChart from './SunshineChart';
import { API_URL } from '../config';
import './SunshineModal.css';
import { FaSun } from "react-icons/fa6";

interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  skyc1: string | null;
  wxcodes: string | null;
  precip_in: number | null;
}

interface SunshineModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  sunTimes?: {
    sunrise: string | null;
    sunset: string | null;
  } | null;
}

export default function SunshineModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  sunTimes,
}: SunshineModalProps) {
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
    if (!data.length || !sunTimes?.sunrise || !sunTimes?.sunset) {
      return { sunshineHours: 0, sunshinePct: 0, daylightHours: 0 };
    }

    const parseTimeToHour = (timeStr: string): number => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hour = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour + minutes / 60;
    };

    const sunriseHour = parseTimeToHour(sunTimes.sunrise);
    const sunsetHour = parseTimeToHour(sunTimes.sunset);

    const skyToSunshineFactor = (skyCode: string | null): number => {
      if (!skyCode) return 0.5;
      const code = skyCode.toUpperCase();
      switch (code) {
        case 'CLR':
        case 'SKC': return 1.0;
        case 'FEW': return 0.90;
        case 'SCT': return 0.55;
        case 'BKN': return 0.25;
        case 'OVC': return 0.05;
        default: return 0.5;
      }
    };

    const wxToAttenuation = (wxCode: string | null): number => {
      if (!wxCode) return 1.0;
      const wx = wxCode.toLowerCase();
      if (wx.includes('ts')) return 0.0;
      if (wx.includes('+ra')) return 0.05;
      if (wx.includes('ra')) return 0.10;
      if (wx.includes('-ra')) return 0.15;
      if (wx.includes('sn')) return 0.05;
      if (wx.includes('fz')) return 0.05;
      if (wx.includes('dz')) return 0.20;
      if (wx.includes('fg')) return 0.15;
      if (wx.includes('br')) return 0.70;
      if (wx.includes('hz')) return 0.75;
      return 1.0;
    };

    let totalSunshine = 0;
    let daylightObservations = 0;

    data.forEach(hour => {
      const hourDate = new Date(hour.ts_local);
      const hourNum = hourDate.getHours();
      const isDaylight = hourNum >= Math.floor(sunriseHour) && hourNum < Math.ceil(sunsetHour);
      
      if (isDaylight) {
        const sunshineFactor = skyToSunshineFactor(hour.skyc1);
        const attenuation = wxToAttenuation(hour.wxcodes);
        totalSunshine += sunshineFactor * attenuation;
        daylightObservations++;
      }
    });

    const sunshinePct = daylightObservations > 0 
      ? (totalSunshine / daylightObservations) * 100 
      : 0;

    return {
      sunshineHours: Math.round(totalSunshine * 10) / 10,
      sunshinePct: Math.round(sunshinePct),
      daylightHours: Math.round((sunsetHour - sunriseHour) * 10) / 10,
    };
  };

  const summary = calculateSummary(filteredData);

  const modalContent = (
    <div 
      className={`sunshine-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sunshine-modal">
        <button 
          className="sunshine-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="sunshine-modal-handle" />

        <div className="sunshine-modal-content">
          {loading ? (
            <div className="sunshine-modal-loading">
              <div className="loading-spinner" />
              <span>Loading sunshine data...</span>
            </div>
          ) : error ? (
            <div className="sunshine-modal-error">
              <span>⚠️ {error}</span>
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="sunshine-modal-loading">
              <span>No data available</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="sunshine-header">
                <h2 className="sunshine-title">{stationName}</h2>
                <div className="sunshine-subtitle">
                  {showTodayOnly ? "Today's Sunshine" : 'Last 24 Hours Sunshine'}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="sunshine-summary">
                <div className="sunshine-stat-main">
                  <FaSun className="sunshine-icon" aria-label="Sunshine" />
                  <span className="sunshine-hours">{summary.sunshineHours}</span>
                  <span className="sunshine-hours-label">hrs</span>
                </div>
                <div className="sunshine-stat-secondary">
                  <span className="sunshine-pct">{summary.sunshinePct}%</span>
                  <span className="sunshine-pct-label">
                    of {summary.daylightHours} daylight hours
                  </span>
                </div>
              </div>

              {/* Chart */}
              <SunshineChart
                data={filteredData}
                darkMode={darkMode}
                sunTimes={sunTimes}
                showTodayOnly={showTodayOnly}
              />

              {/* Toggle */}
              <div className="sunshine-toggle-container">
                <button
                  className={`sunshine-toggle-btn ${showTodayOnly ? 'active' : ''}`}
                  onClick={() => setShowTodayOnly(!showTodayOnly)}
                >
                  <span className="toggle-label">Today Only</span>
                  <div className={`toggle-switch ${showTodayOnly ? 'on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </button>
              </div>

              {/* Legend */}
              <div className="sunshine-legend">
                <div className="legend-item">
                  <div className="legend-color sunshine-color" />
                  <span>Sunshine</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color night-color" />
                  <span>Night</span>
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