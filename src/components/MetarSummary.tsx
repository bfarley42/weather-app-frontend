// src/components/MetarSummary.tsx
/**
 * METAR Summary Display Component
 * Apple Weather-inspired design showing current observation details
 * 
 * Features:
 * - Large weather icon with condition and cloud cover
 * - Wind compass with direction and speed
 * - Apple-style barometric pressure gauge with trend
 * - Parsed text summary from METAR
 * - Educational tooltips for each card
 * - Raw METAR display
 */

import { useState } from 'react';
import { 
  Droplets, 
  Wind, 
  Eye,
  Cloud,
  Thermometer,
  X,
} from 'lucide-react';
import {  LuTrendingUp, LuTrendingDown, LuMinus } from 'react-icons/lu';
import { BiMessageSquareDetail } from "react-icons/bi";
// import { CiCloudMoon } from 'react-icons/ci';
import type { MetarData } from './MetarModal';
import './MetarSummary.css';
// ADD this import
import { 
  getWeatherIcon, 
  getConditionText, 
  getCloudCoverPercent, 
  getWeatherCardGradient 
} from '../utils/weatherIcons';

interface MetarSummaryProps {
  data: MetarData;
  stationName: string;
  darkMode?: boolean;
  isDay?: boolean;
}

// ============================================================================
// Tooltip Component
// ============================================================================
interface TooltipProps {
  title: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

function Tooltip({ title, content, isOpen, onClose, darkMode }: TooltipProps) {
  if (!isOpen) return null;
  
  return (
    <div className={`metar-tooltip ${darkMode ? 'dark' : ''}`}>
      <div className="tooltip-header">
        <span className="tooltip-title">{title}</span>
        <button className="tooltip-close" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <p className="tooltip-content">{content}</p>
    </div>
  );
}

// Tooltip content for each card
const tooltipContent = {
  conditions: {
    title: "Current Conditions",
    content: "Shows the current sky condition and temperature observed at this station. Cloud cover is measured in oktas (eighths of the sky covered). Clear means less than 1/8 coverage, while overcast means the entire sky is covered."
  },
  wind: {
    title: "Wind",
    content: "Wind direction shows where the wind is coming FROM (a north wind blows from north to south). Speed is the sustained wind, while gusts are brief increases. Winds above 25 mph can affect driving; above 40 mph may cause property damage."
  },
  pressure: {
    title: "Barometric Pressure",
    content: "Atmospheric pressure helps predict weather changes. Rising pressure (above 30.00\" Hg) typically indicates fair weather approaching. Falling pressure often signals incoming storms or precipitation. Rapid changes suggest more dramatic weather shifts."
  },
  details: {
    title: "Weather Details",
    content: "Dewpoint indicates moisture in the air—closer to the temperature means higher humidity and possible fog. Visibility is how far you can see clearly. Humidity affects comfort: above 65% feels muggy, below 30% feels dry."
  },
  dewpoint: {
    title: "Dewpoint",
    content: "The temperature at which air becomes saturated and dew forms. When dewpoint is close to the actual temperature, expect fog or high humidity. A dewpoint above 65°F feels muggy; below 50°F feels comfortable."
  },
  humidity: {
    title: "Relative Humidity",
    content: "The percentage of moisture in the air relative to the maximum it can hold at the current temperature. Above 65% feels humid; below 30% feels dry and can irritate skin and airways."
  },
  visibility: {
    title: "Visibility",
    content: "How far you can see clearly. Reduced by fog, rain, snow, haze, or dust. Below 3 miles affects driving; below 1 mile is considered very poor. Pilots need at least 3 miles for visual flight rules."
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

// Wind direction to cardinal
function getWindDirection(degrees: number | null): string {
  if (degrees === null) return '--';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}


// Generate a natural language summary
function generateSummary(data: MetarData, _isDay: boolean): string {
  const parts: string[] = [];
  
  // Condition
  const condition = getConditionText(data.sky_code, data.wx_code);
  
  // Temperature description
  if (data.temp_f !== null) {
    if (data.temp_f <= 20) parts.push(`Very cold at ${Math.round(data.temp_f)}°F`);
    else if (data.temp_f <= 32) parts.push(`Cold at ${Math.round(data.temp_f)}°F`);
    else if (data.temp_f <= 50) parts.push(`Cool at ${Math.round(data.temp_f)}°F`);
    else if (data.temp_f <= 70) parts.push(`Mild at ${Math.round(data.temp_f)}°F`);
    else if (data.temp_f <= 85) parts.push(`Warm at ${Math.round(data.temp_f)}°F`);
    else parts.push(`Hot at ${Math.round(data.temp_f)}°F`);
  }
  
  // Sky/weather
  if (condition !== 'Unknown') {
    parts.push(`with ${condition.toLowerCase()} skies`);
  }
  
  // Wind
  if (data.wind_speed_mph !== null) {
    if (data.wind_speed_mph < 3) {
      parts.push('and calm winds');
    } else if (data.wind_speed_mph <= 10) {
      parts.push(`and light winds from the ${getWindDirection(data.wind_direction_deg)}`);
    } else if (data.wind_speed_mph <= 20) {
      parts.push(`with moderate ${getWindDirection(data.wind_direction_deg)} winds at ${Math.round(data.wind_speed_mph)} mph`);
    } else {
      parts.push(`with strong ${getWindDirection(data.wind_direction_deg)} winds at ${Math.round(data.wind_speed_mph)} mph`);
    }
    
    if (data.wind_gust_mph && data.wind_gust_mph > data.wind_speed_mph + 5) {
      parts.push(`gusting to ${Math.round(data.wind_gust_mph)} mph`);
    }
  }
  
  // Visibility
  if (data.visibility_mi !== null && data.visibility_mi < 6) {
    if (data.visibility_mi < 1) {
      parts.push('Visibility is very poor');
    } else if (data.visibility_mi < 3) {
      parts.push('Visibility is reduced');
    }
  }
  
  // Pressure trend
  if (data.pressure_trend === 'Rising') {
    parts.push('Pressure is rising, suggesting improving conditions');
  } else if (data.pressure_trend === 'Falling') {
    parts.push('Pressure is falling, which may indicate incoming weather');
  }
  
  return parts.join(' ') + '.';
}

// Format observation time
function formatObservedTime(isoString: string | null): string {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }) + ' ' + date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
}

// ============================================================================
// Pressure Gauge Component (Apple Weather style)
// ============================================================================
interface PressureGaugeProps {
  pressure: number | null;
  trend: string | null;
  darkMode?: boolean;
}

function PressureGauge({ pressure, trend, darkMode }: PressureGaugeProps) {
  // Pressure typically ranges from 28.5 to 31.0 inches Hg
  const minPressure = 28.8;
  const maxPressure = 31.0;
  
  // Calculate needle angle (arc goes from -135° to 135°, total 270°)
  const getNeedleAngle = (p: number | null): number => {
    if (p === null) return 0;
    const clamped = Math.max(minPressure, Math.min(maxPressure, p));
    const ratio = (clamped - minPressure) / (maxPressure - minPressure);
    return -135 + (ratio * 270);
  };
  
  const angle = getNeedleAngle(pressure);
  
  // Arc path for the gauge background
  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad)
    };
  };
  
  const createArcPath = (radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(50, 50, radius, endAngle);
    const end = polarToCartesian(50, 50, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };
  
  // Color zones on the gauge
    const getZoneColor = (p: number | null, dark: boolean): string => {
    if (p === null) return dark ? '#475569' : '#94a3b8';
    if (p < 29.8) return '#6366f1'; // Low - indigo (stormy)
    if (p < 30.2) return dark ? '#94a3b8' : '#64748b'; // Normal - gray
    return '#14b8a6'; // High - teal (fair)
    };

  return (
    <div className="pressure-gauge-container">
      <svg viewBox="0 0 100 70" className="pressure-gauge-svg">
        {/* Background arc */}
        <path
          d={createArcPath(38, -135, 135)}
          fill="none"
          stroke={darkMode ? '#334155' : '#e2e8f0'}
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Low pressure zone (orange) */}
        <path
          d={createArcPath(38, -135, -45)}
          fill="none"
          stroke={darkMode ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'}
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* High pressure zone (green) */}
        <path
          d={createArcPath(38, 45, 135)}
          fill="none"
          stroke={darkMode ? 'rgba(20, 184, 166, 0.4)' : 'rgba(20, 184, 166, 0.3)'}
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Tick marks */}
        {[-135, -90, -45, 0, 45, 90, 135].map((tickAngle, i) => {
          const inner = polarToCartesian(50, 50, 30, tickAngle);
          const outer = polarToCartesian(50, 50, 33, tickAngle);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={darkMode ? '#64748b' : '#94a3b8'}
              strokeWidth="1"
            />
          );
        })}
        
        {/* Labels */}
        <text x="15" y="58" className={`gauge-label ${darkMode ? 'dark' : ''}`}>Low</text>
        <text x="85" y="58" className={`gauge-label ${darkMode ? 'dark' : ''}`} textAnchor="end">High</text>
        
        {/* Needle */}
        <g transform={`rotate(${angle}, 50, 50)`}>
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="18"
            stroke={getZoneColor(pressure, darkMode || false)}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Needle base circle */}
          <circle
            cx="50"
            cy="50"
            r="4"
            fill={getZoneColor(pressure, darkMode || false)}
          />
        </g>
        
        {/* Center dot */}
        <circle
          cx="50"
          cy="50"
          r="2"
          fill={darkMode ? '#1e293b' : '#ffffff'}
        />
      </svg>
      
      {/* Value display */}
      <div className="pressure-gauge-value">
        <span className="pressure-number">
          {pressure !== null ? pressure.toFixed(2) : '--'}
        </span>
        <span className="pressure-unit">" Hg</span>
      </div>
      
      {/* Trend indicator */}
      <div className={`pressure-trend-badge ${trend?.toLowerCase() || ''}`}>
        {trend === 'Rising' && <LuTrendingUp size={14} />}
        {trend === 'Falling' && <LuTrendingDown size={14} />}
        {trend === 'Steady' && <LuMinus size={14} />}
        <span>{trend || '--'}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export default function MetarSummary({
  data,
  stationName,
  darkMode = false,
  isDay = true,
}: MetarSummaryProps) {
  
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const condition = getConditionText(data.sky_code, data.wx_code);
  const summary = generateSummary(data, isDay);
  const cloudCover = getCloudCoverPercent(data.sky_code);
  
  const toggleTooltip = (key: string) => {
    setActiveTooltip(activeTooltip === key ? null : key);
  };
  
  return (
    <div className={`metar-summary ${darkMode ? 'dark' : ''}`}>
      
      {/* Header */}
      <div className="metar-header">
        <h2 className="metar-station-name">{stationName}</h2>
        <span className="metar-observed-time">
          Observed at {formatObservedTime(data.observed_at)}
        </span>
      </div>
      
      {/* Main Content - New Layout */}
      <div className="metar-layout">
        
        {/* Left Column: Weather + Summary */}
        <div className="metar-left-column">
          {/* Weather Icon Card */}
            <div 
            className={`metar-card metar-icon-card clickable-card ${activeTooltip === 'conditions' ? 'tooltip-active' : ''}`}
            onClick={() => toggleTooltip('conditions')}
            style={{ background: getWeatherCardGradient(data.sky_code, data.wx_code, isDay) }}
            >

            <Tooltip 
              {...tooltipContent.conditions}
              isOpen={activeTooltip === 'conditions'}
              onClose={() => setActiveTooltip(null)}
              darkMode={darkMode}
            />
            
            <div className="metar-icon-wrapper">
              {getWeatherIcon(data.sky_code, data.wx_code, 72, isDay)}
            </div>
            <div className="metar-condition-text">{condition}</div>
            
            {/* Cloud cover */}
            {cloudCover && (
              <div className="metar-cloud-cover">
                <Cloud size={14} />
                <span>{cloudCover.percent}% cloud cover</span>
              </div>
            )}
            
            {data.temp_f !== null && (
              <div className="metar-temp-large">{Math.round(data.temp_f)}°</div>
            )}
          </div>
          
          {/* Summary Text - Same width as icon card */}
          <div className="metar-card metar-summary-card">
            <p>{summary}</p>
          </div>
        </div>
        
        {/* Right Column: Wind + Pressure */}
        <div className="metar-right-column">
          {/* Wind Card */}
          <div className="metar-card metar-wind-card clickable-card"
            onClick={() => toggleTooltip('wind')}
          >

            <Tooltip 
              {...tooltipContent.wind}
              isOpen={activeTooltip === 'wind'}
              onClose={() => setActiveTooltip(null)}
              darkMode={darkMode}
            />
            
            <div className="metar-card-header">
              <Wind size={16} />
              <span>WIND</span>
            </div>
            
            <div className="metar-wind-content">
              <div className="metar-compass">
                <div className="compass-ring">
                  <span className="compass-dir compass-n">N</span>
                  <span className="compass-dir compass-e">E</span>
                  <span className="compass-dir compass-s">S</span>
                  <span className="compass-dir compass-w">W</span>
                  
                  <div className="compass-ticks">
                    {[...Array(12)].map((_, i) => (
                      <div 
                        key={i} 
                        className="compass-tick"
                        style={{ transform: `rotate(${i * 30}deg)` }}
                      />
                    ))}
                  </div>
                  
                  {data.wind_direction_deg !== null ? (
                    <div 
                      className="compass-pointer"
                      style={{ transform: `rotate(${data.wind_direction_deg}deg)` }}
                    >
                      <div className="pointer-arrow" />
                    </div>
                  ) : (
                    <div className="compass-center-dot" />
                  )}
                </div>
              </div>
              
              <div className="metar-wind-stats">
                <div className="wind-speed-main">
                  {data.wind_speed_mph !== null 
                    ? `${Math.round(data.wind_speed_mph)}` 
                    : '--'}
                  <span className="wind-unit">mph</span>
                </div>
                <div className="wind-direction-text">
                  {data.wind_direction_deg !== null 
                    ? `${getWindDirection(data.wind_direction_deg)} (${Math.round(data.wind_direction_deg)}°)`
                    : 'Calm'}
                </div>
                {data.wind_gust_mph !== null && data.wind_gust_mph > 0 && (
                  <div className="wind-gust-text">
                    Gusts to {Math.round(data.wind_gust_mph)} mph
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Pressure Card with Gauge */}
          <div className="metar-card metar-pressure-card clickable-card"
           onClick={() => toggleTooltip('pressure')}
          >

            <Tooltip 
              {...tooltipContent.pressure}
              isOpen={activeTooltip === 'pressure'}
              onClose={() => setActiveTooltip(null)}
              darkMode={darkMode}
            />
            
            <div className="metar-card-header">
              <span>PRESSURE</span>
            </div>
            
            <PressureGauge 
              pressure={data.pressure_in}
              trend={data.pressure_trend}
              darkMode={darkMode}
            />
          </div>
        </div>
      </div>
      
      {/* Details Card - Full Width */}
      <div className="metar-card metar-details-card"
    //    onClick={() => toggleTooltip('details')}
      >
  
        <Tooltip 
          {...tooltipContent.details}
          isOpen={activeTooltip === 'details'}
          onClose={() => setActiveTooltip(null)}
          darkMode={darkMode}
        />
        
        <div className="metar-card-header">
          <BiMessageSquareDetail size={16} />
          <span>DETAILS</span>
        </div>
                
        <div className="metar-details-grid">
        {/* Dewpoint */}
        {data.dewpoint_f !== null && (
            <div 
            className="detail-item clickable-card"
            onClick={() => toggleTooltip('dewpoint')}
            >
            <Tooltip 
                {...tooltipContent.dewpoint}
                isOpen={activeTooltip === 'dewpoint'}
                onClose={() => setActiveTooltip(null)}
                darkMode={darkMode}
            />
            <Thermometer size={14} className="detail-icon" />
            <span className="detail-label">Dewpoint</span>
            <span className="detail-value">{Math.round(data.dewpoint_f)}°</span>
            </div>
        )}
        
        {/* Humidity */}
        <div 
            className="detail-item clickable-card"
            onClick={() => toggleTooltip('humidity')}
        >
            <Tooltip 
            {...tooltipContent.humidity}
            isOpen={activeTooltip === 'humidity'}
            onClose={() => setActiveTooltip(null)}
            darkMode={darkMode}
            />
            <Droplets size={14} className="detail-icon" />
            <span className="detail-label">Humidity</span>
            <span className="detail-value">
            {data.humidity_pct !== null ? `${Math.round(data.humidity_pct)}%` : '--'}
            </span>
        </div>
        
        {/* Visibility */}
        <div 
            className="detail-item clickable-card"
            onClick={() => toggleTooltip('visibility')}
        >
            <Tooltip 
            {...tooltipContent.visibility}
            isOpen={activeTooltip === 'visibility'}
            onClose={() => setActiveTooltip(null)}
            darkMode={darkMode}
            />
            <Eye size={14} className="detail-icon" />
            <span className="detail-label">Visibility</span>
            <span className="detail-value">
            {data.visibility_mi !== null 
                ? data.visibility_mi >= 10 
                ? '10+ mi' 
                : `${data.visibility_mi.toFixed(1)} mi`
                : '--'}
            </span>
        </div>
        </div>
      </div>
      
      {/* Raw METAR */}
      {data.metar_raw && (
        <div className="metar-raw">
          <div className="metar-raw-label">RAW METAR</div>
          <code className="metar-raw-code">{data.metar_raw}</code>
        </div>
      )}
    </div>
  );
}