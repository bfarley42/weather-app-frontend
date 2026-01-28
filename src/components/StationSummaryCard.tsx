// src/components/StationSummaryCard.tsx
/**
 * Apple Weather-inspired summary cards showing current conditions
 * and 24-hour historical overview for a weather station.
 * 
 * Card 1: Current conditions (temp + icon)
 * Card 2: Last 24 hours (temp band + 5 stats)
 */

import { useState, useEffect, useRef  } from 'react';
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
  // Cloudy,
  Waves,
  // Moon,
} from 'lucide-react';
import { 
  // FaThermometerEmpty, 
  // FaThermometerQuarter, 
  FaThermometerHalf, 
  // FaThermometerThreeQuarters, 
  // FaThermometerFull,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
// import { 
//   // BsThermometerSnow,
//   // BsThermometerSun ,
//  } from "react-icons/bs";
import { IoSpeedometerOutline } from 'react-icons/io5';
import { API_URL } from '../config';
import './StationSummaryCard.css';
import { PiThermometerColdFill, PiThermometerHotFill, PiThermometerFill  } from "react-icons/pi";

// REMOVE the ?url imports
// import moonUrl from '../assets/weather/moon.svg?url';
// import moonCloudUrl from '../assets/weather/moon_cloud.svg?url';

// ADD these component imports
import MoonIcon from '../assets/weather/moon.svg?react';
import MoonCloudIcon from '../assets/weather/moon_cloud.svg?react';

// import { BsCloudMoon } from 'react-icons/bs';
// // Custom moon icons
// import { ReactComponent as MoonIcon } from '../assets/weather/moon.svg?react';
// import { ReactComponent as MoonCloudIcon } from '../assets/weather/moon_cloud.svg?react';


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
  pressure_in?: number | null;      // <-- ADD THIS
  pressure_trend?: string | null;   // <-- ADD THIS (e.g. "Rising", "Falling")
}

interface Last24hStats {
  high_f: number | null;
  low_f: number | null;
  avg_temp_f: number | null;
  precip_in: number | null;
  avg_humidity_pct: number | null;
  avg_wind_mph: number | null;
  max_gust_mph: number | null;
  dominant_condition: string | null;
  condition_hours: number | null;
  observation_count: number;
  avg_dewpoint_f: number | null;

}

interface HourlyDataPoint {
  hour: string;
  temp_f: number | null;
  sky_code: string | null;
  wx_code: string | null;
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
  hourly_history: HourlyDataPoint[];  // <-- ADD THIS
  vs_yesterday: Comparison | null;
  vs_normal: Comparison | null;
  data_freshness_minutes: number | null;
  generated_at: string;
  sun_times: SunTimes | null;
  daily_history?: DailyHistoryPoint[];  // Optional with ?
}

interface StationSummaryCardProps {
  stationId: string;
  stationName?: string;
  darkMode?: boolean;
}

interface SunTimes {
  sunrise: string | null;
  sunset: string | null;
  is_day: boolean;
}

interface DailyHistoryPoint {
  date: string;
  day_label: string;
  high_f: number | null;
  low_f: number | null;
  normal_high_f: number | null;
  normal_low_f: number | null;
  avg_temp_f: number | null;
  temp_diff_f: number | null;
  dominant_condition: string | null;
  precip_in: number | null;
  snow_in: number | null;  // <-- ADD THIS
  sky_code: string | null;
}

// ============================================================================
// Daily Temperature Bar Component (Ghost Bar with Normal comparison)
// ============================================================================

interface TempBarProps {
  low: number | null;
  high: number | null;
  normalLow: number | null;
  normalHigh: number | null;
  currentTemp: number | null | undefined;  // Only for "Today" row
  globalMin: number;
  globalMax: number;
}

function DailyTempBar({ low, high, normalLow, normalHigh, currentTemp, globalMin, globalMax }: TempBarProps) {
  if (low === null || high === null) {
    return <div className="temp-bar-empty">--</div>;
  }
  
  const totalRange = globalMax - globalMin;
  
  // Calculate positions as percentages
  const getPosition = (temp: number) => ((temp - globalMin) / totalRange) * 100;
  
  const actualLeft = getPosition(low);
  const actualWidth = getPosition(high) - actualLeft;
  
  // Normal range (for whisker marks)
  const normalLowPos = normalLow !== null ? getPosition(normalLow) : null;
  const normalHighPos = normalHigh !== null ? getPosition(normalHigh) : null;
  
  // Current temp marker position
  const currentPos = (currentTemp !== null && currentTemp !== undefined) ? getPosition(currentTemp) : null;
  
  // Gradient color based on temps
  const getGradientColors = () => {
    const getTempColor = (temp: number): string => {
      const t = Math.max(0, Math.min(100, temp));
      const pct = (t - 10) / 80;
      
      const colors = [
        { pct: 0.00, r: 49,  g: 34,  b: 221 },
        { pct: 0.25, r: 59,  g: 130, b: 246 },
        { pct: 0.40, r: 6,   g: 182, b: 212 },
        { pct: 0.50, r: 34,  g: 197, b: 94  },
        { pct: 0.65, r: 234, g: 179, b: 8   },
        { pct: 0.80, r: 249, g: 115, b: 22  },
        { pct: 1.00, r: 214, g: 41,  b: 42  },
      ];
      
      let lower = colors[0];
      let upper = colors[colors.length - 1];
      
      for (let i = 0; i < colors.length - 1; i++) {
        if (pct >= colors[i].pct && pct <= colors[i + 1].pct) {
          lower = colors[i];
          upper = colors[i + 1];
          break;
        }
      }
      
      const range = upper.pct - lower.pct;
      const rangePct = range === 0 ? 0 : (pct - lower.pct) / range;
      
      const r = Math.round(lower.r + (upper.r - lower.r) * rangePct);
      const g = Math.round(lower.g + (upper.g - lower.g) * rangePct);
      const b = Math.round(lower.b + (upper.b - lower.b) * rangePct);
      
      return `rgb(${r}, ${g}, ${b})`;
    };
    
    return `linear-gradient(90deg, ${getTempColor(low)} 0%, ${getTempColor(high)} 100%)`;
  };
  
  return (
    <div className="daily-temp-bar-container">
      {/* Low temp label */}
      <span className="daily-temp-label daily-temp-low">{Math.round(low)}°</span>
      
      {/* Bar track */}
      <div className="daily-temp-track">
        {/* Normal range whiskers */}
        {normalLowPos !== null && (
          <div className="normal-whisker normal-whisker-low" style={{ left: `${normalLowPos}%` }} />
        )}
        {normalHighPos !== null && (
          <div className="normal-whisker normal-whisker-high" style={{ left: `${normalHighPos}%` }} />
        )}
        
        {/* Actual temperature bar */}
        <div 
          className="daily-temp-bar-actual"
          style={{
            left: `${actualLeft}%`,
            width: `${actualWidth}%`,
            background: getGradientColors()
          }}
        />
        
        {/* Current temp marker (only for Today) */}
        {currentPos !== null && (
          <div className="current-temp-marker" style={{ left: `${currentPos}%` }} />
        )}
      </div>
      
      {/* High temp label */}
      <span className="daily-temp-label daily-temp-high">{Math.round(high)}°</span>
    </div>
  );
}
// ============================================================================
// Unified Weather Icon Function
// ============================================================================

function getWeatherIcon(
  skyCode: string | null, 
  wxCode: string | null, 
  size: number = 52, 
  isDay: boolean = true,
  className: string = "weather-icon"
) {
  const iconProps = { size, strokeWidth: 1.5 };
  
  // Check weather code first (precipitation - same day/night)
  if (wxCode) {
    const wx = wxCode.toUpperCase();
    if (wx.includes('TS')) return <CloudLightning {...iconProps} className={`${className} icon-lightning`} />;
    if (wx.includes('SN') || wx.includes('SG') || wx.includes('PL')) return <Snowflake {...iconProps} className={`${className} icon-snow`} />;
    if (wx.includes('FZRA') || wx.includes('FZDZ')) return <CloudSnow {...iconProps} className={`${className} icon-freezing`} />;
    if (wx.includes('RA')) return <CloudRain {...iconProps} className={`${className} icon-rain`} />;
    if (wx.includes('DZ')) return <CloudDrizzle {...iconProps} className={`${className} icon-drizzle`} />;
    if (wx.includes('FG')) return <CloudFog {...iconProps} className={`${className} icon-fog`} />;
    if (wx.includes('BR') || wx.includes('HZ')) return <CloudFog {...iconProps} className={`${className} icon-mist`} />;
  }
  
  // Sky condition - use moon SVGs at night
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    
// ... inside getWeatherIcon function ...

    // Clear
    if (sky === 'CLR' || sky === 'SKC' || sky === 'FEW') {
      if (isDay) {
        return <Sun {...iconProps} className={`${className} icon-clear`} />;
      } else {
        // REPLACE THE <img> TAG WITH THIS:
        return (
          <MoonIcon 
            width={size} 
            height={size} 
            className={`${className} icon-clear-night`} 
            // SVG will now inherit color from CSS (fill="currentColor" or stroke="currentColor")
          />
        );
      }
    }
    
    // Partly cloudy
    if (sky === 'SCT' || sky === 'BKN') {
      if (isDay) {
        return <Cloud {...iconProps} className={`${className} icon-partly-cloudy`} />;
      } else {
        // REPLACE THE <img> TAG WITH THIS:
        return (
          <MoonCloudIcon 
            width={size} 
            height={size} 
            className={`${className} icon-cloudy-night`} 
          />
        );
      }
    }
    
    // Overcast - same day/night
    if (sky === 'OVC') {
      return <Cloud {...iconProps} className={`${className} icon-overcast`} />;
    }
  }
  
  return <Cloud {...iconProps} className={`${className} icon-default`} />;
}


function getConditionIcon(condition: string | null, size: number = 24) {
  if (!condition) return <Cloud size={size} className="stat-icon" />;
  
  const cond = condition.toLowerCase();
  const iconProps = { size, strokeWidth: 1.5, className: "stat-icon" };
  
  if (cond.includes('rain') || cond.includes('shower')) return <CloudRain {...iconProps} className="stat-icon precip-icon" />;
  if (cond.includes('snow')) return <Snowflake {...iconProps} className="stat-icon snow-icon" />;
  if (cond.includes('storm')) return <CloudLightning {...iconProps} className="stat-icon condition-icon" />;
  if (cond.includes('fog') || cond.includes('haz') || cond.includes('mist')) return <CloudFog {...iconProps} className="stat-icon" />;
  if (cond.includes('cloud') || cond.includes('cldy')) return <Cloud {...iconProps} className="stat-icon" />;
  if (cond.includes('clear')) return <Sun {...iconProps} className="stat-icon icon-clear" />;
  
  return <Cloud {...iconProps} className="stat-icon" />;
}


interface ThermometerResult {
  icon: React.ReactNode;
  color: string;
}

function getThermometerIcon(tempDiff: number | null, size: number = 18): ThermometerResult {
  // Default (no data)
  if (tempDiff === null) {
    return { 
      icon: <PiThermometerFill  size={size} />, 
      color: '#8d8d8dff' 
    };
  }
  
  // Much Colder: <= -10°
  if (tempDiff <= -10) {
    return { 
      icon: <PiThermometerColdFill  size={size} />, 
      color: '#3ea8e6ff' 
    };
  }
  
  // Colder: -10° to -5°
  if (tempDiff <= -5) {
    return { 
      icon: <PiThermometerFill  size={size} />, 
      color: '#8d8d8dff' 
    };
  }
  
  // Normal: -5° to +5°
  if (tempDiff <= 5) {
    return { 
      icon: <PiThermometerFill  size={size} />, 
      color: '#8d8d8dff' 
    };
  }
  
  // Warmer: +5° to +10°
  if (tempDiff <= 10) {
    return { 
      icon: <FaThermometerHalf size={size} />, 
      color: '#8d8d8dff' 
    };
  }
  
  // Much Warmer: > +10°
  return { 
    icon: <PiThermometerHotFill   size={size} />, 
    color: '#d61e0d' 
  };
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
  

const getGradientColors = () => {
 
  const getTempColor = (temp: number): string => {
    // Clamp temp between 10 and 90
    const t = Math.max(0, Math.min(100, temp));
    // Convert to 0-1 scale (10° = 0, 90° = 1)
    const pct = (t - 10) / 90;
    

        const colors = [
      { pct: 0.00, r: 49,  g: 34,  b: 221 },  // #2C0658 purple (10°F)
      { pct: 0.13, r: 59,  g: 130, b: 246 },  // #442698ff blue
      { pct: 0.26, r: 6,   g: 182, b: 212 },  // #1883C4 cyan
      { pct: 0.39, r: 34,  g: 197, b: 94  },  // #16CFD8 green (50°F)
      { pct: 0.52, r: 234, g: 179, b: 8   },  // #86E068 yellow
      { pct: 0.65, r: 234, g: 179, b: 8   },  // #d8e068ff yellow
      { pct: 0.78, r: 249, g: 115, b: 22  },  // #f3a71bff orange
      { pct: 1.00, r: 214, g: 41,  b: 42  },  // #d61e0dff red (90°F)
    ];

    // Find the two color stops we're between
    let lower = colors[0];
    let upper = colors[colors.length - 1];
    
    for (let i = 0; i < colors.length - 1; i++) {
      if (pct >= colors[i].pct && pct <= colors[i + 1].pct) {
        lower = colors[i];
        upper = colors[i + 1];
        break;
      }
    }
    
    // Interpolate between the two colors
    const range = upper.pct - lower.pct;
    const rangePct = range === 0 ? 0 : (pct - lower.pct) / range;
    
    const r = Math.round(lower.r + (upper.r - lower.r) * rangePct);
    const g = Math.round(lower.g + (upper.g - lower.g) * rangePct);
    const b = Math.round(lower.b + (upper.b - lower.b) * rangePct);
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Get colors for actual low and high temps
  const lowColor = getTempColor(low);
  const highColor = getTempColor(high);
  
  return `linear-gradient(90deg, ${lowColor} 0%, ${highColor} 100%)`;
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
  // Try to parse the ISO string for actual time
  if (hoursAgo !== null) {hoursAgo -= 53/60}  //most temps are recorded at 53 after hour
  if (isoString) {
    try {
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
    } catch {
      // Fall through
    }
  }
  
  // Fallback to hours ago if no valid timestamp
  if (hoursAgo !== null) {
    if (hoursAgo < 1) {
      const mins = Math.round(hoursAgo * 60);
      return mins <= 1 ? 'just now' : `${mins} min ago`;
    } else if (hoursAgo < 24) {
      const hrs = Math.round(hoursAgo);
      const hrs2 = Math.round(hoursAgo*2)/2; //round to .5
      return hrs === 1 ? '1 hr ago' : `${hrs2} hrs ago`;
    }
  }
  
  return 'recently';
}

function isHourDaytime(hourStr: string, sunrise: string | null, sunset: string | null): boolean {
  if (!sunrise || !sunset) return true; // Default to day if no sun data
  
  // Parse time string to hour (handles both "10 PM" and "7:23 AM")
  const parseHour = (str: string): number => {
    // Match formats: "10 PM", "7:23 AM", "12:00 PM"
    const match = str.match(/(\d+)(?::\d+)?\s*(AM|PM)/i);
    if (!match) return 12;
    let hour = parseInt(match[1]);
    const isPM = match[2].toUpperCase() === 'PM';
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    return hour;
  };
  
  const hour = parseHour(hourStr);
  const sunriseHour = parseHour(sunrise);
  const sunsetHour = parseHour(sunset);
  
  return hour >= sunriseHour && hour < sunsetHour;
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
  const hourlyScrollRef = useRef<HTMLDivElement>(null);

  // After the data loads, scroll to the right
useEffect(() => {
  if (hourlyScrollRef.current && summary?.hourly_history.length) {
    hourlyScrollRef.current.scrollLeft = hourlyScrollRef.current.scrollWidth;
  }
}, [summary?.hourly_history]);
  
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
  
  const { current, last_24h, vs_normal } = summary;
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
        </div>
        
        {/* Current conditions: Temp + Icon side by side */}
        <div className="current-content">
          
          {/* Left: Temp + Feels like */}
        <div className="current-left">
        <div className="current-temp">
            {current.temp_f !== null ? `${Math.round(current.temp_f)}°` : '--'}
                {/* (last_24h.high_f !== null ? `${Math.round(last_24h.high_f)}°` : '--')} */}
        </div>
        <div className="feels-like">
            Feels like {current.feels_like_f !== null ? `${Math.round(current.feels_like_f)}°` : '--'}
        </div>

        {/* Barometric Pressure */}
        {current.pressure_in !== null && current.pressure_in !== undefined && (
          <div className="pressure-display" aria-label="Barometric pressure">
            {/* <span className="pressure-label">Pressure</span> */}
            <IoSpeedometerOutline size={14} style={{ marginRight: '2px' }} />
            <span className="pressure-val">{current.pressure_in.toFixed(2)}" Hg</span>

            {current.pressure_trend === 'Rising' && <FaArrowUp size={10} className="trend-up" />}
            {current.pressure_trend === 'Falling' && <FaArrowDown size={10} className="trend-down" />}
            {current.pressure_trend === 'Steady' && <span className="trend-steady">—</span>}
          </div>
        )}       

        </div>

          
          {/* Right: Icon + Wind */}
          <div className="current-right">
            <div className="weather-icon-container">
              {getWeatherIcon(current.sky_code, current.wx_code, 56, summary.sun_times?.is_day ?? true, "weather-icon")}
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
                  {/* Centered timestamp */}
        
        </div>
        
        <div className="observed-time">
          <Clock size={12} />
          <span>as of {formatObservedTime(current.observed_at, current.hours_ago)}</span>
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
            // low={50} 
            // high={70} 
            current={current.temp_f}
          />
        </div>
            {/* Apple-style scroll indicator */}
        <div className="scroll-indicator"></div>    
{/* 1x7 Horizontal Scroll Stats */}
<div className="stats-scroll-container">
  <div className="stats-row-horizontal">

    {/* 1. Precip */}
    <div className="stat-item-vertical">
      <Droplets size={18} className="stat-icon precip-icon" />
      <span className="stat-value">
        {last_24h.precip_in !== null ? `${last_24h.precip_in.toFixed(2)}"` : '--'}
      </span>
      <span className="stat-label">PRECIP</span>
    </div>


    {/* 2. Dominant condition */}
    <div className="stat-item-vertical">
      <div className="condition-stat-icon">
        {getConditionIcon(last_24h.dominant_condition, 18)}
      </div>
      <span className="stat-value">
        {last_24h.condition_hours ? `${last_24h.condition_hours} hrs` : '--'}
      </span>
      <span className="stat-label">{last_24h.dominant_condition || 'COND'}</span>
    </div>

    {/* 3. Avg Temp vs Normal */}
    <div className="stat-item-vertical">
      <div className="stat-icon" style={{ color: getThermometerIcon(vs_normal?.temp_diff_f ?? null).color }}>
        {getThermometerIcon(vs_normal?.temp_diff_f ?? null, 18).icon}
      </div>
      <span className="stat-value">
        {last_24h.high_f !== null && last_24h.low_f !== null  ? `${Math.round(last_24h.low_f)}°/${Math.round(last_24h.high_f)}°` : '--'}
      </span>
      <span className="stat-label">
        {vs_normal?.temp_diff_f !== null && vs_normal?.temp_diff_f !== undefined
          ? `${vs_normal.temp_diff_f >= 0 ? '+' : ''}${Math.round(vs_normal.temp_diff_f)}° NORMAL`
          : 'NORMAL'}
      </span>
    </div>

    {/* 4. Avg Wind */}
    <div className="stat-item-vertical">
      <Wind size={18} className="stat-icon" style={{ color: '#94a3b8' }} />
      <span className="stat-value">
        {last_24h.avg_wind_mph !== null 
          ? <>{Math.round(last_24h.avg_wind_mph)}<span style={{ fontSize: '0.7em', marginLeft: '1px' }}>mph</span></>
          : '--'}
      </span>
      <span className="stat-label">WINDS</span>
    </div>

    {/* 5. Max Gust */}
    <div className="stat-item-vertical">
      <Wind size={18} className="stat-icon wind-stat-icon" />
      <span className="stat-value">
        {last_24h.max_gust_mph !== null 
          ? <>{Math.round(last_24h.max_gust_mph)}<span style={{ fontSize: '0.7em', marginLeft: '1px' }}>mph</span></>
          : '--'}
      </span>
      <span className="stat-label">MAX GUST</span>
    </div>




    {/* 6. Humidity (avg) */}
    <div className="stat-item-vertical">
      <Waves size={18} className="stat-icon humidity-icon" />
      <span className="stat-value">
        {last_24h.avg_humidity_pct !== null ? `${Math.round(last_24h.avg_humidity_pct)}%` : '--'}
      </span>
      <span className="stat-label">HUMIDITY</span>
    </div>

    {/* 7. Dew Point (avg) */}
    <div className="stat-item-vertical">
      <FaThermometerHalf size={18} className="stat-icon dewpoint-icon" />
      <span className="stat-value">
        {last_24h.avg_dewpoint_f !== null ? `${Math.round(last_24h.avg_dewpoint_f)}°` : '--'}
      </span>
      <span className="stat-label">DEW PT</span>
    </div>

  </div>
</div>

      
      {/* Data freshness warning (if stale) */}
      
      {current.hours_ago !== null && (current.hours_ago -53/60)  > 2 && (
        <div className="freshness-warning">
          ⚠️ Data is {Math.round(current.hours_ago -53/60)} hours old
        </div>
      )}
      
    </div>
      {/* ============================================================
          CARD 3: Hourly History
          ============================================================ */}
      <div className={`summary-card hourly-card ${darkMode ? 'dark' : ''}`}>
        <div className="section-label">24-HOUR HISTORY</div>
        
        {/* Apple-style scroll indicator */}
        <div className="scroll-indicator"></div>
        
        <div className="hourly-scroll-container" ref={hourlyScrollRef}>
          <div className="hourly-scroll-row">
          {summary.hourly_history.map((hour, index) => {
            const isDay = isHourDaytime(
              hour.hour, 
              summary.sun_times?.sunrise ?? null, 
              summary.sun_times?.sunset ?? null
            );
            
            return (
              <div key={index} className="hourly-item">
                <span className="hourly-time">{hour.hour}</span>
                <div className="hourly-icon-wrapper">
                  {getWeatherIcon(hour.sky_code, hour.wx_code, 22, isDay, "hourly-icon")}
                </div>
                <span className="hourly-temp">
                  {hour.temp_f !== null ? `${Math.round(hour.temp_f)}°` : '--'}
                </span>
              </div>
            );
          })}
          </div>
        </div>
        
      </div>     
    
{/* ============================================================
          CARD 4: Daily History (7-day)
          ============================================================ */}
    {summary.daily_history && summary.daily_history.length > 0 && (() => {
  // Filter to only days with temperature data
  const daysWithData = summary.daily_history.filter(day => day.high_f !== null && day.low_f !== null);
  
  if (daysWithData.length === 0) return null;
  
  // Calculate global min/max from days WITH data
  const allTemps = daysWithData.flatMap(d => [
    d.low_f, d.high_f, d.normal_low_f, d.normal_high_f
  ]).filter((t): t is number => t !== null);
  
  const globalMin = Math.min(...allTemps) - 2;
  const globalMax = Math.max(...allTemps) + 2;
  
  return (
    <div className={`summary-card daily-card ${darkMode ? 'dark' : ''}`}>
      <div className="section-label">7-DAY HISTORY</div>
      
      <div className="daily-history-list">
        {daysWithData.map((day, index) => (
                <div key={day.date} className="daily-row">
                  {/* Column 1: Day label */}
                  <div className="daily-day-label">
                    {day.day_label}
                  </div>
                  
                  {/* Column 2: Condition + Precip */}
                  <div className="daily-condition">
                    {(() => {
                      // Show snow icon if it snowed
                      if (day.snow_in !== null && day.snow_in >= 0.1) {
                        return <Snowflake size={20} className="daily-icon icon-snow" />;
                      }
                      // Show rain icon if it rained (but didn't snow)
                      if (day.precip_in !== null && day.precip_in >= 0.01) {
                        return <CloudRain size={20} className="daily-icon icon-rain" />;
                      }
                      // Otherwise show sky condition
                      return getWeatherIcon(day.sky_code, null, 20, true, "daily-icon");
                    })()}
                    {/* Show snow total if snowed */}
                    {day.snow_in !== null && day.snow_in >= 0.1 ? (
                      <span className="daily-precip daily-snow">{day.snow_in.toFixed(1)}"</span>
                    ) : day.precip_in !== null && day.precip_in >= 0.01 ? (
                      <span className="daily-precip">{day.precip_in.toFixed(2)}"</span>
                    ) : null}
                  </div>
                  
                  {/* Column 3: Temperature bar */}
                  <DailyTempBar
                    low={day.low_f}
                    high={day.high_f}
                    normalLow={day.normal_low_f}
                    normalHigh={day.normal_high_f}
                    currentTemp={index === 0 ? current.temp_f : null}
                    globalMin={globalMin}
                    globalMax={globalMax}
                  />
                  
                  {/* Optional: Deviation badge */}
                  {day.temp_diff_f !== null && (
                    <span className={`daily-diff ${day.temp_diff_f > 0 ? 'warmer' : day.temp_diff_f < 0 ? 'colder' : 'neutral'}`}>
                      {day.temp_diff_f > 0 ? '+' : ''}{Math.round(day.temp_diff_f)}°
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}    

    </div>
    
  );
  
}