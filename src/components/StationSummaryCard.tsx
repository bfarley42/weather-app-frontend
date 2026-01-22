// src/components/StationSummaryCard.tsx
/**
 * Apple Weather-inspired summary card showing current conditions
 * and 24-hour historical overview for a weather station.
 */

import { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  CloudRain,
//   CloudSnow,
  Cloud,
  Sun,
  CloudFog,
  CloudLightning,
  Snowflake,
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
  avg_humidity_pct: number | null;
  avg_wind_mph: number | null;
  max_gust_mph: number | null;
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

function getWeatherIcon(_condition: string | null, skyCode: string | null, wxCode: string | null) {
  const iconProps = { size: 48, strokeWidth: 1.5 };
  
  // Check weather code first (precipitation takes priority)
  if (wxCode) {
    const wx = wxCode.toUpperCase();
    if (wx.includes('TS')) return <CloudLightning {...iconProps} className="icon-lightning" />;
    if (wx.includes('SN') || wx.includes('SG') || wx.includes('PL')) return <Snowflake {...iconProps} className="icon-snow" />;
    if (wx.includes('RA') || wx.includes('DZ') || wx.includes('SH')) return <CloudRain {...iconProps} className="icon-rain" />;
    if (wx.includes('FG') || wx.includes('BR') || wx.includes('HZ')) return <CloudFog {...iconProps} className="icon-fog" />;
  }
  
  // Fall back to sky condition
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    if (sky === 'CLR' || sky === 'SKC') return <Sun {...iconProps} className="icon-clear" />;
    if (sky === 'FEW') return <Sun {...iconProps} className="icon-clear" />;
    if (sky === 'SCT') return <Cloud {...iconProps} className="icon-partly" />;
    if (sky === 'BKN') return <Cloud {...iconProps} className="icon-cloudy" />;
    if (sky === 'OVC') return <Cloud {...iconProps} className="icon-overcast" />;
  }
  
  // Default
  return <Thermometer {...iconProps} className="icon-default" />;
}

// ============================================================================
// Trend Indicator Component
// ============================================================================

function TrendIndicator({ diff, unit, label }: { diff: number | null; unit: string; label: string }) {
  if (diff === null || diff === 0) {
    return (
      <div className="trend-item trend-neutral">
        <Minus size={14} />
        <span>Same as {label}</span>
      </div>
    );
  }
  
  const isPositive = diff > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const absValue = Math.abs(diff);
  
  // Format the value
  let displayValue = '';
  if (unit === '°') {
    displayValue = `${absValue.toFixed(0)}${unit}`;
  } else if (unit === '"') {
    displayValue = `${absValue.toFixed(2)}${unit}`;
  } else {
    displayValue = `${absValue}${unit}`;
  }
  
  // Determine the descriptor
  let descriptor = '';
  if (unit === '°') {
    descriptor = isPositive ? 'warmer' : 'cooler';
  } else if (unit === '"') {
    descriptor = isPositive ? 'wetter' : 'drier';
  }
  
  return (
    <div className={`trend-item ${isPositive ? 'trend-up' : 'trend-down'}`}>
      <Icon size={14} />
      <span>{displayValue} {descriptor} than {label}</span>
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
  
  const { current, last_24h, vs_yesterday, vs_normal } = summary;
  const displayName = stationName || summary.station_name || stationId;
  
  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className={`summary-card ${darkMode ? 'dark' : ''}`}>
      {/* Header: Station name */}
      <div className="summary-header">
        <h2 className="station-name">{displayName}</h2>
        <div className="observed-time">
          <Clock size={12} />
          <span>as of {formatObservedTime(current.observed_at, current.hours_ago)}</span>
        </div>
      </div>
      
      {/* Hero section: Current temp + condition */}
      <div className="summary-hero">
        <div className="hero-temp-section">
          <div className="hero-temp">
            {current.temp_f !== null ? `${Math.round(current.temp_f)}°` : '--'}
          </div>
          {current.feels_like_f !== null && current.temp_f !== null && 
           Math.abs(current.feels_like_f - current.temp_f) >= 3 && (
            <div className="feels-like">
              Feels like {Math.round(current.feels_like_f)}°
            </div>
          )}
        </div>
        
        <div className="hero-condition-section">
          {getWeatherIcon(current.condition, current.sky_code, current.wx_code)}
          <div className="condition-text">
            {current.condition || 'No data'}
          </div>
        </div>
      </div>
      
      {/* Wind info (if significant) */}
      {current.wind_mph !== null && current.wind_mph > 0 && (
        <div className="wind-info">
          <Wind size={14} />
          <span>
            {Math.round(current.wind_mph)} mph
            {current.wind_gust_mph && current.wind_gust_mph > current.wind_mph + 5 && (
              <>, gusts to {Math.round(current.wind_gust_mph)}</>
            )}
          </span>
        </div>
      )}
      
      {/* Divider */}
      <div className="summary-divider"></div>
      
      {/* Last 24 hours stats */}
      <div className="last-24h-section">
        <div className="section-label">Last 24 Hours</div>
        
        <div className="stats-row">
          <div className="stat-item">
            <Thermometer size={16} className="stat-icon temp-high" />
            <div className="stat-content">
              <span className="stat-value">
                {last_24h.high_f !== null ? `${Math.round(last_24h.high_f)}°` : '--'}
              </span>
              <span className="stat-label">High</span>
            </div>
          </div>
          
          <div className="stat-item">
            <Thermometer size={16} className="stat-icon temp-low" />
            <div className="stat-content">
              <span className="stat-value">
                {last_24h.low_f !== null ? `${Math.round(last_24h.low_f)}°` : '--'}
              </span>
              <span className="stat-label">Low</span>
            </div>
          </div>
          
          <div className="stat-item">
            <Droplets size={16} className="stat-icon precip" />
            <div className="stat-content">
              <span className="stat-value">
                {last_24h.precip_in !== null ? `${last_24h.precip_in.toFixed(2)}"` : '--'}
              </span>
              <span className="stat-label">Precip</span>
            </div>
          </div>
          
          <div className="stat-item">
            <Eye size={16} className="stat-icon humidity" />
            <div className="stat-content">
              <span className="stat-value">
                {last_24h.avg_humidity_pct !== null ? `${Math.round(last_24h.avg_humidity_pct)}%` : '--'}
              </span>
              <span className="stat-label">Humidity</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comparisons */}
      {(vs_yesterday || vs_normal) && (
        <>
          <div className="summary-divider"></div>
          
          <div className="comparisons-section">
            {vs_yesterday && vs_yesterday.temp_diff_f !== null && (
              <TrendIndicator 
                diff={vs_yesterday.temp_diff_f} 
                unit="°" 
                label="yesterday" 
              />
            )}
            
            {vs_normal && vs_normal.temp_diff_f !== null && (
              <TrendIndicator 
                diff={vs_normal.temp_diff_f} 
                unit="°" 
                label="normal" 
              />
            )}
            
            {/* Show precip comparison only if there was meaningful precip */}
            {vs_yesterday && 
             vs_yesterday.precip_diff_in !== null && 
             (Math.abs(vs_yesterday.precip_diff_in) >= 0.01 || (last_24h.precip_in || 0) >= 0.01) && (
              <TrendIndicator 
                diff={vs_yesterday.precip_diff_in} 
                unit='"' 
                label="yesterday" 
              />
            )}
          </div>
        </>
      )}
      
      {/* Data freshness indicator */}
      {summary.data_freshness_minutes !== null && summary.data_freshness_minutes > 90 && (
        <div className="freshness-warning">
          ⚠️ Data is {Math.round(summary.data_freshness_minutes / 60)} hours old
        </div>
      )}
    </div>
  );
}