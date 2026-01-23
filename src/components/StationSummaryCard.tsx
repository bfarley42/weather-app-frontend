// src/components/StationSummaryCard.tsx
/**
 * Apple Weather-inspired summary cards showing current conditions
 * and 24-hour historical overview for a weather station.
 * 
 * Card 1: Current conditions (temp + icon)
 * Card 2: Last 24 hours (temp band + 5 stats)
 */

import { useState, useEffect } from 'react';
import { 
  Droplets, 
  Wind, 
  Clock,
  CloudRain,
  CloudSnow,
  Cloud,
  Sun,
  CloudFog,
  CloudLightning,
  Snowflake,
  CloudDrizzle,
  Cloudy,
  Waves,
  Eye
} from 'lucide-react';
import { API_URL } from '../config';
import './StationSummaryCard.css';

// ============================================================================
// Types
// ============================================================================

interface CurrentConditions {
  temp_f: number | null;
  feels_like_f: number | null;
  humidity_pct: number | null;
  wind_mph: number | null;
  wind_gust_mph: number | null;
  condition: string | null;
  sky_code: string | null;
  wx_code: string | null;
  observed_at: string | null;
  hours_ago: number | null;
}

interface Last24hStats {
  high_f: number | null;
  low_f: number | null;
  precip_in: number | null;
  snow_in: number | null;
  avg_humidity_pct: number | null;
  avg_wind_mph: number | null;
  max_gust_mph: number | null;
  dominant_condition: string | null;
  observation_count: number;
}

interface Comparison {
  temp_diff_f: number | null;
  precip_diff_in: number | null;
  label: string;
}

interface StationSummary {
  station_id: string;
  station_name: string | null;
  timezone: string | null;
  current: CurrentConditions;
  last_24h: Last24hStats;
  vs_yesterday: Comparison | null;
  vs_normal: Comparison | null;
  data_freshness_minutes: number | null;
  generated_at: string;
}

interface StationSummaryCardProps {
  stationId: string;
  stationName?: string;
  darkMode?: boolean;
}

// ============================================================================
// Weather Icon Selector
// ============================================================================

function getWeatherIcon(_condition: string | null, skyCode: string | null, wxCode: string | null, size: number = 52) {
  const iconProps = { size, strokeWidth: 1.5 };
  
  // Check weather code first (precipitation takes priority)
  if (wxCode) {
    const wx = wxCode.toUpperCase();
    if (wx.includes('TS')) return <CloudLightning {...iconProps} className="weather-icon icon-lightning" />;
    if (wx.includes('SN') || wx.includes('SG') || wx.includes('PL')) return <Snowflake {...iconProps} className="weather-icon icon-snow" />;
    if (wx.includes('FZRA') || wx.includes('FZDZ')) return <CloudSnow {...iconProps} className="weather-icon icon-freezing" />;
    if (wx.includes('RA')) return <CloudRain {...iconProps} className="weather-icon icon-rain" />;
    if (wx.includes('DZ')) return <CloudDrizzle {...iconProps} className="weather-icon icon-drizzle" />;
    if (wx.includes('FG')) return <CloudFog {...iconProps} className="weather-icon icon-fog" />;
    if (wx.includes('BR') || wx.includes('HZ')) return <CloudFog {...iconProps} className="weather-icon icon-mist" />;
  }
  
  // Fall back to sky condition
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    if (sky === 'CLR' || sky === 'SKC') return <Sun {...iconProps} className="weather-icon icon-clear" />;
    if (sky === 'FEW') return <Sun {...iconProps} className="weather-icon icon-mostly-clear" />;
    if (sky === 'SCT') return <Cloud {...iconProps} className="weather-icon icon-partly-cloudy" />;
    if (sky === 'BKN') return <Cloudy {...iconProps} className="weather-icon icon-mostly-cloudy" />;
    if (sky === 'OVC') return <Cloud {...iconProps} className="weather-icon icon-overcast" />;
  }
  
  // Default - just show cloud
  return <Cloud {...iconProps} className="weather-icon icon-default" />;
}

// ============================================================================
// Wind Description Helper
// ============================================================================

function getWindDescription(avgWindMph: number | null): string {
  if (avgWindMph === null) return '--';
  if (avgWindMph < 1) return 'Calm';
  if (avgWindMph < 8) return 'Light';
  if (avgWindMph < 15) return 'Breezy';
  if (avgWindMph < 25) return 'Windy';
  if (avgWindMph < 35) return 'Very Windy';
  return 'High Wind';
}

// ============================================================================
// Temperature Gradient Band Component
// ============================================================================

interface TempBandProps {
  low: number | null;
  high: number | null;
  current: number | null;
}

function TemperatureBand({ low, high, current }: TempBandProps) {
  if (low === null || high === null) {
    return <div className="temp-band temp-band-empty">No data</div>;
  }
  
  // Calculate position of current temp marker (0-100%)
  const range = high - low;
  let markerPosition = 50; // default to middle
  
  if (current !== null && range > 0) {
    markerPosition = ((current - low) / range) * 100;
    // Clamp between 5% and 95% so marker stays visible
    markerPosition = Math.max(5, Math.min(95, markerPosition));
  }
  
  // Determine gradient colors based on temperature range
  const getGradientColors = () => {
    const avgTemp = (low + high) / 2;
    
    if (high <= 32) {
      return 'linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%)';
    } else if (low >= 85) {
      return 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)';
    } else if (avgTemp <= 32) {
      return 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)';
    } else if (avgTemp <= 50) {
      return 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #22d3d8 100%)';
    } else if (avgTemp <= 70) {
      return 'linear-gradient(90deg, #06b6d4 0%, #22c55e 50%, #84cc16 100%)';
    } else if (avgTemp <= 85) {
      return 'linear-gradient(90deg, #84cc16 0%, #eab308 50%, #f97316 100%)';
    } else {
      return 'linear-gradient(90deg, #f97316 0%, #ef4444 50%, #dc2626 100%)';
    }
  };
  
  return (
    <div className="temp-band-container">
      <div className="temp-band" style={{ background: getGradientColors() }}>
        {current !== null && (
          <div 
            className="temp-marker"
            style={{ left: `${markerPosition}%` }}
            title={`Current: ${Math.round(current)}°`}
          >
            <div className="temp-marker-dot"></div>
          </div>
        )}
      </div>
      <div className="temp-band-labels">
        <span className="temp-low-label">{Math.round(low)}°</span>
        <span className="temp-high-label">{Math.round(high)}°</span>
      </div>
    </div>
  );
}

// ============================================================================
// Format timestamp to readable time
// ============================================================================

function formatObservedTime(isoString: string | null, hoursAgo: number | null): string {
  if (!isoString) return 'Unknown';
  
  try {
    const date = new Date(isoString);
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (hoursAgo !== null && hoursAgo < 2) {
      const mins = Math.round(hoursAgo * 60);
      if (mins < 60) {
        return `${timeStr} (${mins}m ago)`;
      }
    }
    
    return timeStr;
  } catch {
    return 'Unknown';
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function StationSummaryCard({ 
  stationId, 
  stationName,
  darkMode = false 
}: StationSummaryCardProps) {
  const [summary, setSummary] = useState<StationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchSummary() {
      if (!stationId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}/api/stations/${stationId}/current-summary`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch summary: ${response.status}`);
        }
        
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSummary();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stationId]);
  
  // ----------------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <div className={`summary-card summary-card-loading ${darkMode ? 'dark' : ''}`}>
        <div className="loading-pulse">
          <div className="pulse-circle"></div>
          <span>Loading conditions...</span>
        </div>
      </div>
    );
  }
  
  // ----------------------------------------------------------------
  // Error state
  // ----------------------------------------------------------------
  if (error || !summary) {
    return (
      <div className={`summary-card summary-card-error ${darkMode ? 'dark' : ''}`}>
        <span>⚠️ {error || 'Unable to load weather summary'}</span>
      </div>
    );
  }
  
  const { current, last_24h } = summary;
  const displayName = stationName || summary.station_name || stationId;
  
  // ----------------------------------------------------------------
  // Render - Two Cards
  // ----------------------------------------------------------------
  return (
    <div className={`summary-cards-wrapper ${darkMode ? 'dark' : ''}`}>
      
      {/* ============================================================
          CARD 1: Current Conditions
          ============================================================ */}
      <div className={`summary-card current-card ${darkMode ? 'dark' : ''}`}>
        {/* Header: Station name + time */}
        <div className="summary-header">
          <h2 className="station-name">{displayName}</h2>
          <div className="observed-time">
            <Clock size={12} />
            <span>as of {formatObservedTime(current.observed_at, current.hours_ago)}</span>
          </div>
        </div>
        
        {/* Current conditions: Temp + Icon side by side */}
        <div className="current-content">
          {/* Left: Temp + Feels like */}
          <div className="current-left">
            <div className="current-temp">
              {current.temp_f !== null ? `${Math.round(current.temp_f)}°` : '--'}
            </div>
            <div className="feels-like">
              Feels like {current.feels_like_f !== null ? `${Math.round(current.feels_like_f)}°` : '--'}
            </div>
          </div>
          
          {/* Right: Icon + Wind */}
          <div className="current-right">
            <div className="weather-icon-container">
              {getWeatherIcon(current.condition, current.sky_code, current.wx_code, 56)}
              {current.condition && (
                <span className="condition-label">{current.condition}</span>
              )}
            </div>
            <div className="wind-display">
              <Wind size={14} className="wind-icon" />
              <span className="wind-speed">
                {current.wind_mph !== null ? `${Math.round(current.wind_mph)} mph` : '-- mph'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* ============================================================
          CARD 2: Last 24 Hours
          ============================================================ */}
      <div className={`summary-card history-card ${darkMode ? 'dark' : ''}`}>
        <div className="section-label">LAST 24 HOURS</div>
        
        {/* Temperature band - centered */}
        <div className="temp-band-wrapper">
          <TemperatureBand 
            low={last_24h.low_f} 
            high={last_24h.high_f} 
            current={current.temp_f}
          />
        </div>
        
        {/* 5 Stats Row */}
        <div className="stats-row-5">
          {/* 1. Precip */}
          <div className="stat-item-vertical">
            <span className="stat-value">
              {last_24h.precip_in !== null ? `${last_24h.precip_in.toFixed(2)}"` : '--'}
            </span>
            <Droplets size={18} className="stat-icon precip-icon" />
            <span className="stat-label">PRECIP</span>
          </div>
          
          {/* 2. Wind (avg) */}
          <div className="stat-item-vertical">
            <span className="stat-value">
              {last_24h.avg_wind_mph !== null ? `${Math.round(last_24h.avg_wind_mph)}` : '--'}
            </span>
            <Wind size={18} className="stat-icon wind-stat-icon" />
            <span className="stat-label">{getWindDescription(last_24h.avg_wind_mph)}</span>
          </div>
          
          {/* 3. Conditions (dominant) */}
          <div className="stat-item-vertical">
            <span className="stat-value">
              {last_24h.dominant_condition || '--'}
            </span>
            <Eye size={18} className="stat-icon condition-icon" />
            <span className="stat-label">COND</span>
          </div>
          
          {/* 4. Snow */}
          <div className="stat-item-vertical">
            <span className="stat-value">
              {last_24h.snow_in !== null ? `${last_24h.snow_in.toFixed(1)}"` : '--'}
            </span>
            <Snowflake size={18} className="stat-icon snow-icon" />
            <span className="stat-label">SNOW</span>
          </div>
          
          {/* 5. Humidity (avg) */}
          <div className="stat-item-vertical">
            <span className="stat-value">
              {last_24h.avg_humidity_pct !== null ? `${Math.round(last_24h.avg_humidity_pct)}%` : '--'}
            </span>
            <Waves size={18} className="stat-icon humidity-icon" />
            <span className="stat-label">HUMID</span>
          </div>
        </div>
      </div>
      
      {/* Data freshness warning (if stale) */}
      {summary.data_freshness_minutes !== null && summary.data_freshness_minutes > 120 && (
        <div className="freshness-warning">
          ⚠️ Data is {Math.round(summary.data_freshness_minutes / 60)} hours old
        </div>
      )}
    </div>
  );
}