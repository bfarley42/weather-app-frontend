// src/components/ConditionHistoryModal.tsx
/**
 * Modal showing the "Weather Story of the Day"
 * - Timeline strip showing hourly conditions
 * - Duration bars showing time spent in each condition
 * - Algorithmic narrative describing the day
 * - Notable stats (precip, wind, visibility)
 * 
 * Clicking any hour on the timeline opens MetarModal for that hour's details
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Droplets, Wind, Eye, Thermometer } from 'lucide-react';
import MetarModal from './MetarModal';
import { API_URL } from '../config';
import './ConditionSummary24HModal.css';

// ============================================================================
// Types
// ============================================================================
interface HourlyCondition {
  ts_local: string;
  tmpf: number | null;
  dwpf: number | null;
  skyc1: string | null;
  wxcodes: string | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  max_gust_mph: number | null;
  relh_pct: number | null;
  feelslike_f: number | null;
  vsby_mi?: number | null;
}

interface ConditionHistoryModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  timezone?: string;
}

interface ConditionSummary {
  condition: string;
  hours: number;
  percentage: number;
  color: string;
  icon: string;
}

// ============================================================================
// Color & Icon Mapping
// ============================================================================
const conditionStyles: Record<string, { color: string; colorDark: string; icon: string }> = {
  'clear': { color: '#f59e0b', colorDark: '#fbbf24', icon: '☀️' },
  'sunny': { color: '#f59e0b', colorDark: '#fbbf24', icon: '☀️' },
  'mostly clear': { color: '#fbbf24', colorDark: '#fcd34d', icon: '🌤️' },
  'partly cloudy': { color: '#94a3b8', colorDark: '#cbd5e1', icon: '⛅' },
  'mostly cloudy': { color: '#64748b', colorDark: '#94a3b8', icon: '🌥️' },
  'cloudy': { color: '#64748b', colorDark: '#94a3b8', icon: '☁️' },
  'overcast': { color: '#475569', colorDark: '#64748b', icon: '☁️' },
  'fog': { color: '#9ca3af', colorDark: '#d1d5db', icon: '🌫️' },
  'mist': { color: '#9ca3af', colorDark: '#d1d5db', icon: '🌫️' },
  'haze': { color: '#a8a29e', colorDark: '#d6d3d1', icon: '🌫️' },
  'rain': { color: '#3b82f6', colorDark: '#60a5fa', icon: '🌧️' },
  'light rain': { color: '#60a5fa', colorDark: '#93c5fd', icon: '🌦️' },
  'heavy rain': { color: '#1d4ed8', colorDark: '#3b82f6', icon: '🌧️' },
  'drizzle': { color: '#93c5fd', colorDark: '#bfdbfe', icon: '🌦️' },
  'snow': { color: '#e0f2fe', colorDark: '#f0f9ff', icon: '❄️' },
  'light snow': { color: '#e0f2fe', colorDark: '#f0f9ff', icon: '🌨️' },
  'heavy snow': { color: '#bae6fd', colorDark: '#e0f2fe', icon: '❄️' },
  'thunderstorm': { color: '#6366f1', colorDark: '#818cf8', icon: '⛈️' },
  'freezing rain': { color: '#06b6d4', colorDark: '#22d3ee', icon: '🌧️' },
  'sleet': { color: '#67e8f9', colorDark: '#a5f3fc', icon: '🌨️' },
  'unknown': { color: '#cbd5e1', colorDark: '#e2e8f0', icon: '❓' },
};

function getConditionStyle(skyCode: string | null, wxCode: string | null, darkMode: boolean) {
  // Check weather codes first (precipitation takes priority)
  if (wxCode) {
    const wx = wxCode.toLowerCase();
    if (wx.includes('ts')) return conditionStyles['thunderstorm'];
    if (wx.includes('+ra')) return conditionStyles['heavy rain'];
    if (wx.includes('-ra')) return conditionStyles['light rain'];
    if (wx.includes('ra')) return conditionStyles['rain'];
    if (wx.includes('fzra')) return conditionStyles['freezing rain'];
    if (wx.includes('+sn')) return conditionStyles['heavy snow'];
    if (wx.includes('-sn')) return conditionStyles['light snow'];
    if (wx.includes('sn')) return conditionStyles['snow'];
    if (wx.includes('dz')) return conditionStyles['drizzle'];
    if (wx.includes('fg')) return conditionStyles['fog'];
    if (wx.includes('br')) return conditionStyles['mist'];
    if (wx.includes('hz')) return conditionStyles['haze'];
  }
  
  // Sky conditions
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    if (sky === 'CLR' || sky === 'SKC') return conditionStyles['clear'];
    if (sky === 'FEW') return conditionStyles['mostly clear'];
    if (sky === 'SCT') return conditionStyles['partly cloudy'];
    if (sky === 'BKN') return conditionStyles['mostly cloudy'];
    if (sky === 'OVC') return conditionStyles['overcast'];
  }
  
  return conditionStyles['unknown'];
}

function getConditionLabel(skyCode: string | null, wxCode: string | null): string {
  // Check weather codes first
  if (wxCode) {
    const wx = wxCode.toLowerCase();
    if (wx.includes('ts')) return 'Thunderstorm';
    if (wx.includes('+ra')) return 'Heavy Rain';
    if (wx.includes('-ra')) return 'Light Rain';
    if (wx.includes('ra')) return 'Rain';
    if (wx.includes('fzra')) return 'Freezing Rain';
    if (wx.includes('+sn')) return 'Heavy Snow';
    if (wx.includes('-sn')) return 'Light Snow';
    if (wx.includes('sn')) return 'Snow';
    if (wx.includes('dz')) return 'Drizzle';
    if (wx.includes('fg')) return 'Fog';
    if (wx.includes('br')) return 'Mist';
    if (wx.includes('hz')) return 'Haze';
  }
  
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    if (sky === 'CLR' || sky === 'SKC') return 'Clear';
    if (sky === 'FEW') return 'Mostly Clear';
    if (sky === 'SCT') return 'Partly Cloudy';
    if (sky === 'BKN') return 'Mostly Cloudy';
    if (sky === 'OVC') return 'Overcast';
  }
  
  return 'Unknown';
}

// ============================================================================
// Narrative Generator (No AI needed!)
// ============================================================================
function generateDayNarrative(hourlyData: HourlyCondition[]): string {
  if (!hourlyData || hourlyData.length === 0) return '';
  
  const parts: string[] = [];
  
  // Helper to get hour from timestamp
  const getHour = (ts: string) => new Date(ts).getHours();
  
  // Helper for temperature description
  const getTempDesc = (temp: number | null): string => {
    if (temp === null) return '';
    if (temp <= 20) return 'frigid';
    if (temp <= 32) return 'cold';
    if (temp <= 45) return 'chilly';
    if (temp <= 55) return 'cool';
    if (temp <= 68) return 'mild';
    if (temp <= 78) return 'warm';
    if (temp <= 88) return 'hot';
    return 'very hot';
  };
  
  // Find morning observation (closest to 7am)
  const morningObs = hourlyData.find(h => getHour(h.ts_local) >= 6 && getHour(h.ts_local) <= 8);
  if (morningObs && morningObs.tmpf !== null) {
    const condition = getConditionLabel(morningObs.skyc1, morningObs.wxcodes).toLowerCase();
    const tempDesc = getTempDesc(morningObs.tmpf);
    parts.push(`The day started ${condition} and ${tempDesc} at ${Math.round(morningObs.tmpf)}°F.`);
  }
  
  // Find condition transitions
  const transitions: { hour: number; from: string; to: string }[] = [];
  for (let i = 1; i < hourlyData.length; i++) {
    const prevCondition = getConditionLabel(hourlyData[i-1].skyc1, hourlyData[i-1].wxcodes);
    const currCondition = getConditionLabel(hourlyData[i].skyc1, hourlyData[i].wxcodes);
    
    if (prevCondition !== currCondition) {
      transitions.push({
        hour: getHour(hourlyData[i].ts_local),
        from: prevCondition,
        to: currCondition
      });
    }
  }
  
  // Describe key transitions (limit to 2-3)
  const keyTransitions = transitions.slice(0, 3);
  keyTransitions.forEach(t => {
    const timeStr = t.hour === 0 ? 'midnight' : 
                    t.hour === 12 ? 'noon' :
                    t.hour < 12 ? `${t.hour}am` : `${t.hour - 12}pm`;
    
    // Describe the change
    if (t.to.includes('Rain') || t.to.includes('Snow') || t.to.includes('Drizzle')) {
      parts.push(`${t.to} began around ${timeStr}.`);
    } else if (t.from.includes('Rain') || t.from.includes('Snow')) {
      parts.push(`Precipitation ended around ${timeStr}, becoming ${t.to.toLowerCase()}.`);
    } else if (t.to === 'Clear' || t.to === 'Mostly Clear') {
      parts.push(`Skies cleared around ${timeStr}.`);
    } else if (t.to.includes('Cloudy') && !t.from.includes('Cloudy')) {
      parts.push(`Clouds moved in around ${timeStr}.`);
    }
  });
  
  // Precipitation total
  const totalPrecip = hourlyData.reduce((sum, h) => sum + (h.precip_in || 0), 0);
  if (totalPrecip >= 0.01) {
    parts.push(`Total precipitation: ${totalPrecip.toFixed(2)} inches.`);
  }
  
  // Notable wind
  const maxGust = Math.max(...hourlyData.map(h => h.max_gust_mph || 0));
  const avgWind = hourlyData.reduce((sum, h) => sum + (h.avg_wspd_mph || 0), 0) / hourlyData.length;
  if (maxGust >= 25) {
    parts.push(`Winds gusted up to ${Math.round(maxGust)} mph.`);
  } else if (avgWind >= 15) {
    parts.push(`It was breezy with winds averaging ${Math.round(avgWind)} mph.`);
  }
  
  // Temperature range
  const temps = hourlyData.map(h => h.tmpf).filter((t): t is number => t !== null);
  if (temps.length > 0) {
    const high = Math.max(...temps);
    const low = Math.min(...temps);
    if (high - low >= 15) {
      parts.push(`Temperatures ranged from ${Math.round(low)}°F to ${Math.round(high)}°F.`);
    }
  }
  
  return parts.join(' ');
}

// ============================================================================
// Duration Summary Calculator
// ============================================================================
function calculateConditionDurations(hourlyData: HourlyCondition[], darkMode: boolean): ConditionSummary[] {
  const conditionCounts: Record<string, { count: number; style: { color: string; colorDark: string; icon: string } }> = {};
  
  hourlyData.forEach(h => {
    const label = getConditionLabel(h.skyc1, h.wxcodes);
    const style = getConditionStyle(h.skyc1, h.wxcodes, darkMode);
    
    if (!conditionCounts[label]) {
      conditionCounts[label] = { count: 0, style };
    }
    conditionCounts[label].count++;
  });
  
  const total = hourlyData.length;
  const summaries: ConditionSummary[] = Object.entries(conditionCounts)
    .map(([condition, data]) => ({
      condition,
      hours: data.count,
      percentage: Math.round((data.count / total) * 100),
      color: darkMode ? data.style.colorDark : data.style.color,
      icon: data.style.icon
    }))
    .sort((a, b) => b.hours - a.hours);
  
  return summaries;
}

// ============================================================================
// Main Component
// ============================================================================
export default function ConditionHistoryModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  timezone = 'America/New_York',
}: ConditionHistoryModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<HourlyCondition | null>(null);
  const [showMetarModal, setShowMetarModal] = useState(false);

  // Fetch hourly data
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

  // Handle hour click
  const handleHourClick = (hour: HourlyCondition) => {
    setSelectedHour(hour);
    setShowMetarModal(true);
  };

  if (!isOpen) return null;

  // Calculate stats
  const conditionDurations = calculateConditionDurations(hourlyData, darkMode);
  const narrative = generateDayNarrative(hourlyData);
  
  // Notable stats
  const totalPrecip = hourlyData.reduce((sum, h) => sum + (h.precip_in || 0), 0);
  const maxGust = Math.max(...hourlyData.map(h => h.max_gust_mph || 0), 0);
  const temps = hourlyData.map(h => h.tmpf).filter((t): t is number => t !== null);
  const highTemp = temps.length > 0 ? Math.max(...temps) : null;
  const lowTemp = temps.length > 0 ? Math.min(...temps) : null;

  // Format hour for display
  const formatHour = (ts: string): string => {
    const date = new Date(ts);
    const hour = date.getHours();
    if (hour === 0) return '12a';
    if (hour === 12) return '12p';
    return hour < 12 ? `${hour}a` : `${hour - 12}p`;
  };

  const modalContent = (
    <div 
      className={`condition-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="condition-modal">
        <button 
          className="condition-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="condition-modal-handle" />

        <div className="condition-modal-content">
          {loading ? (
            <div className="condition-modal-loading">
              <div className="loading-spinner" />
              <span>Loading weather story...</span>
            </div>
          ) : error ? (
            <div className="condition-modal-error">
              <span>⚠️ {error}</span>
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="condition-modal-loading">
              <span>No data available</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="condition-header">
                <h2 className="condition-title">{stationName}</h2>
                <span className="condition-subtitle">Last 24 Hours</span>
              </div>

              {/* Timeline Strip */}
              <div className="timeline-section">
                <div className="section-label">HOURLY CONDITIONS</div>
                <div className="timeline-strip">
                  {hourlyData.map((hour, idx) => {
                    const style = getConditionStyle(hour.skyc1, hour.wxcodes, darkMode);
                    return (
                      <div
                        key={idx}
                        className="timeline-hour"
                        onClick={() => handleHourClick(hour)}
                        title={`${formatHour(hour.ts_local)}: ${getConditionLabel(hour.skyc1, hour.wxcodes)}`}
                      >
                        <div 
                          className="timeline-bar"
                          style={{ backgroundColor: darkMode ? style.colorDark : style.color }}
                        />
                        <span className="timeline-icon">{style.icon}</span>
                        {idx % 3 === 0 && (
                          <span className="timeline-label">{formatHour(hour.ts_local)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="timeline-hint">Tap any hour for details</div>
              </div>

              {/* Duration Bars */}
              <div className="duration-section">
                <div className="section-label">CONDITION BREAKDOWN</div>
                <div className="duration-bars">
                  {conditionDurations.map((cd, idx) => (
                    <div key={idx} className="duration-row">
                      <div className="duration-info">
                        <span className="duration-icon">{cd.icon}</span>
                        <span className="duration-condition">{cd.condition}</span>
                      </div>
                      <div className="duration-bar-container">
                        <div 
                          className="duration-bar-fill"
                          style={{ 
                            width: `${cd.percentage}%`,
                            backgroundColor: cd.color
                          }}
                        />
                      </div>
                      <div className="duration-stats">
                        <span className="duration-hours">{cd.hours} hrs</span>
                        <span className="duration-pct">{cd.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Narrative */}
              <div className="narrative-section">
                <div className="section-label">THE DAY IN BRIEF</div>
                <p className="narrative-text">{narrative}</p>
              </div>

              {/* Notable Stats */}
              <div className="stats-section">
                <div className="section-label">NOTABLE STATS</div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <Thermometer size={18} className="stat-icon temp-icon" />
                    <div className="stat-values">
                      <span className="stat-high">{highTemp !== null ? `${Math.round(highTemp)}°` : '--'}</span>
                      <span className="stat-separator">/</span>
                      <span className="stat-low">{lowTemp !== null ? `${Math.round(lowTemp)}°` : '--'}</span>
                    </div>
                    <span className="stat-label">HIGH / LOW</span>
                  </div>
                  
                  <div className="stat-card">
                    <Droplets size={18} className="stat-icon precip-icon" />
                    <span className="stat-value">{totalPrecip.toFixed(2)}"</span>
                    <span className="stat-label">PRECIP</span>
                  </div>
                  
                  <div className="stat-card">
                    <Wind size={18} className="stat-icon wind-icon" />
                    <span className="stat-value">{maxGust > 0 ? `${Math.round(maxGust)}` : '--'}</span>
                    <span className="stat-label">MAX GUST</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MetarModal for selected hour */}
      {selectedHour && (
        <MetarModal
          stationId={stationId}
          stationName={stationName}
          darkMode={darkMode}
          isOpen={showMetarModal}
          onClose={() => {
            setShowMetarModal(false);
            setSelectedHour(null);
          }}
          isDay={true}
          initialData={{
            station_id: stationId,
            observed_at: selectedHour.ts_local,
            metar_raw: null,
            temp_f: selectedHour.tmpf,
            dewpoint_f: selectedHour.dwpf,
            humidity_pct: selectedHour.relh_pct,
            pressure_in: null,
            pressure_trend: null,
            wind_speed_mph: selectedHour.avg_wspd_mph,
            wind_gust_mph: selectedHour.max_gust_mph,
            wind_direction_deg: null,
            sky_code: selectedHour.skyc1,
            wx_code: selectedHour.wxcodes,
            visibility_mi: selectedHour.vsby_mi ?? null,
            precip_in: selectedHour.precip_in,
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}