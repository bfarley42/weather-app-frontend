// src/utils/weatherIcons.tsx
/**
 * Shared weather icon utilities
 * Single source of truth for weather icon rendering across the app
 */

import { 
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Snowflake,
} from 'lucide-react';
import { LuMoon, LuCloudHail } from 'react-icons/lu';
import { CiCloudMoon } from 'react-icons/ci';

/**
 * Get weather icon based on METAR sky and weather codes
 * 
 * @param skyCode - Sky condition code (CLR, FEW, SCT, BKN, OVC)
 * @param wxCode - Weather phenomenon code (RA, SN, FG, TS, etc.)
 * @param size - Icon size in pixels (default 52)
 * @param isDay - Whether it's daytime (affects sun/moon icons)
 * @param className - Base CSS class name for styling
 */
export function getWeatherIcon(
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
    if (wx.includes('DZ') || wx.includes('UP')) return <CloudDrizzle {...iconProps} className={`${className} icon-drizzle`} />;
    if (wx.includes('FG')) return <CloudFog {...iconProps} className={`${className} icon-fog`} />;
    if (wx.includes('BR') || wx.includes('HZ')) return <CloudFog {...iconProps} className={`${className} icon-mist`} />;
    if (wx.includes('GR') || wx.includes('GS')) return <LuCloudHail {...iconProps} className={`${className} icon-hail`} />;
  }
  
  // Sky condition - use moon icons at night
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    
    // Clear or Few clouds
    if (sky === 'CLR' || sky === 'SKC' || sky === 'FEW') {
      if (isDay) {
        return <Sun {...iconProps} className={`${className} icon-clear`} />;
      } else {
        return (
          <LuMoon
            size={size}
            className={`${className} icon-clear-night`} 
          />
        );
      }
    }
    
    // Partly cloudy (Scattered or Broken)
    if (sky === 'SCT' || sky === 'BKN') {
      if (isDay) {
        return <CloudSun {...iconProps} className={`${className} icon-partly-cloudy`} />;
      } else {
        return (
          <CiCloudMoon 
            size={size * 1.1} 
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
  
  // Default fallback
  return <Cloud {...iconProps} className={`${className} icon-default`} />;
}

/**
 * Get icon based on condition text (for stats/summaries)
 * Used when we have human-readable conditions instead of METAR codes
 */
export function getConditionIcon(condition: string | null, size: number = 24) {
  if (!condition) return <Cloud size={size} className="stat-icon" />;
  
  const cond = condition.toLowerCase();
  const iconProps = { size, strokeWidth: 1.5, className: "stat-icon" };
  
  if (cond.includes('rain') || cond.includes('shower')) return <CloudRain {...iconProps} className="stat-icon precip-icon" />;
  if (cond.includes('snow')) return <Snowflake {...iconProps} className="stat-icon snow-icon" />;
  if (cond.includes('storm') || cond.includes('thunder')) return <CloudLightning {...iconProps} className="stat-icon condition-icon" />;
  if (cond.includes('fog') || cond.includes('haz') || cond.includes('mist')) return <CloudFog {...iconProps} className="stat-icon" />;
  if (cond.includes('cloud') || cond.includes('cldy') || cond.includes('overcast')) return <Cloud {...iconProps} className="stat-icon" />;
  if (cond.includes('clear') || cond.includes('sunny')) return <Sun {...iconProps} className="stat-icon icon-clear" />;
  
  return <Cloud {...iconProps} className="stat-icon" />;
}

/**
 * Convert sky code to human-readable condition text
 */
export function getConditionText(skyCode: string | null, wxCode: string | null): string {
  // Weather conditions take priority
  if (wxCode) {
    const wx = wxCode.toUpperCase();
    if (wx.includes('TS')) return 'Thunderstorm';
    if (wx.includes('+RA')) return 'Heavy Rain';
    if (wx.includes('-RA')) return 'Light Rain';
    if (wx.includes('RA')) return 'Rain';
    if (wx.includes('+SN')) return 'Heavy Snow';
    if (wx.includes('-SN')) return 'Light Snow';
    if (wx.includes('SN')) return 'Snow';
    if (wx.includes('FZRA')) return 'Freezing Rain';
    if (wx.includes('FZDZ')) return 'Freezing Drizzle';
    if (wx.includes('DZ')) return 'Drizzle';
    if (wx.includes('FG')) return 'Fog';
    if (wx.includes('BR')) return 'Mist';
    if (wx.includes('HZ')) return 'Haze';
    if (wx.includes('GR')) return 'Hail';
    if (wx.includes('GS')) return 'Small Hail';
    if (wx.includes('PL')) return 'Ice Pellets';
    if (wx.includes('SG')) return 'Snow Grains';
  }
  
  // Sky conditions
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

/**
 * Convert sky code to cloud cover percentage
 */
export function getCloudCoverPercent(skyCode: string | null): { percent: number; label: string } | null {
  if (!skyCode) return null;
  
  const sky = skyCode.toUpperCase();
  
  // METAR sky codes represent oktas (eighths of sky coverage)
  if (sky === 'CLR' || sky === 'SKC') return { percent: 0, label: 'Clear' };
  if (sky === 'FEW') return { percent: 19, label: 'Few clouds' };
  if (sky === 'SCT') return { percent: 44, label: 'Scattered' };
  if (sky === 'BKN') return { percent: 75, label: 'Broken' };
  if (sky === 'OVC') return { percent: 100, label: 'Overcast' };
  
  return null;
}

/**
 * Get dynamic background gradient based on weather conditions
 */
export function getWeatherCardGradient(skyCode: string | null, wxCode: string | null, isDay: boolean): string {
  // Precipitation - use blue-gray
  if (wxCode) {
    const wx = wxCode.toUpperCase();
    if (wx.includes('RA') || wx.includes('DZ')) return 'linear-gradient(145deg, #5b7a99 0%, #3d5a78 100%)';
    if (wx.includes('SN')) return 'linear-gradient(145deg, #8b9eb3 0%, #6b8299 100%)';
    if (wx.includes('TS')) return 'linear-gradient(145deg, #4a5568 0%, #2d3748 100%)';
    if (wx.includes('FG')) return 'linear-gradient(145deg, #9ca3af 0%, #6b7280 100%)';
  }
  
  if (skyCode) {
    const sky = skyCode.toUpperCase();
    // Clear - warmer tones
    if (sky === 'CLR' || sky === 'SKC') {
      return isDay 
        ? 'linear-gradient(145deg, #5b8aad 0%, #3d6a8a 100%)'
        : 'linear-gradient(145deg, #3d4a5c 0%, #252d3a 100%)';
    }
    // Partly cloudy
    if (sky === 'SCT' || sky === 'FEW') {
      return 'linear-gradient(145deg, #6b8a9e 0%, #4a6a7e 100%)';
    }
    // Mostly cloudy / overcast - darker so white cloud shows
    if (sky === 'BKN' || sky === 'OVC') {
      return 'linear-gradient(145deg, #4a5568 0%, #2d3748 100%)';
    }
  }
  
  // Default
  return 'linear-gradient(145deg, #6b7fa3 0%, #4a5a78 100%)';
}