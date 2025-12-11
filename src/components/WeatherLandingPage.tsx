// src/components/WeatherLandingPage.tsx
import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './WeatherLandingPage.css';

// Types matching your API response (updated with skyc1 and wxcodes)
interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  relh_pct: number | null;
  max_gust_mph: number | null;
  feelslike_f: number | null;
  skyc1: string | null;      // Sky condition: CLR, FEW, SCT, BKN, OVC
  wxcodes: string | null;    // Weather codes: RA, SN, FG, etc.
}

interface VisualCrossingCurrent {
  temp: number;
  feelslike: number;
  humidity: number;
  windspeed: number;
  conditions: string;
  icon: string;
}

interface VisualCrossingHour {
  datetime: string;
  temp: number;
  icon: string;
  conditions: string;
  humidity: number;
  windspeed: number;
  precip: number;
}

interface TimelinePoint {
  time: Date;
  temp: number;
  icon: string;
  label: string;
  isPast: boolean;
  isCurrent: boolean;
}

interface WeatherLandingPageProps {
  stationId?: string;
  stationName?: string;
  location?: string; // For Visual Crossing (e.g., "Sitka,AK")
  apiBaseUrl?: string;
  visualCrossingApiKey: string;
  darkMode?: boolean;
}

// Weather icon mapping for Visual Crossing icon codes
const getWeatherIcon = (icon: string | undefined): string => {
  const icons: Record<string, string> = {
    'clear-day': '☀️',
    'clear-night': '🌙',
    'partly-cloudy-day': '⛅',
    'partly-cloudy-night': '☁️',
    'cloudy': '☁️',
    'rain': '🌧️',
    'showers-day': '🌦️',
    'showers-night': '🌧️',
    'thunder-rain': '⛈️',
    'thunder-showers-day': '⛈️',
    'snow': '❄️',
    'snow-showers-day': '🌨️',
    'snow-showers-night': '🌨️',
    'fog': '🌫️',
    'wind': '💨',
    'sleet': '🌨️',
  };
  return icons[icon || ''] || '🌤️';
};

// Map METAR sky condition codes to icons (for historical data)
export const getMetarIcon = (skyc1: string | null, wxcodes: string | null, hour: number): string => {
  const isNight = hour < 6 || hour >= 20;


  
  // Check weather codes first (precipitation takes priority)
  if (wxcodes) {
    const wx = wxcodes.toUpperCase();
    if (wx.includes('TS')) return '⛈️';           // Thunderstorm
    if (wx.includes('SN') || wx.includes('SG')) return '❄️';  // Snow
    if (wx.includes('FZRA') || wx.includes('PL')) return '🌨️'; // Freezing rain/ice
    if (wx.includes('RA') || wx.includes('DZ')) return '🌧️';  // Rain/drizzle
    if (wx.includes('SH')) return isNight ? '🌧️' : '🌦️';     // Showers
    if (wx.includes('FG') || wx.includes('BR')) return '🌫️';  // Fog/mist
    if (wx.includes('HZ')) return '🌫️';           // Haze
  }
  
  // Map sky condition codes
  if (skyc1) {
    const sky = skyc1.toUpperCase();
    if (sky === 'CLR' || sky === 'SKC' || sky === 'CAVOK') {
      return isNight ? '🌙' : '☀️';
    }
    if (sky === 'FEW') {
      return isNight ? '🌙' : '⛅';
    }
    if (sky === 'SCT') {
      return isNight ? '☁️' : '🌤️';
    }
    if (sky === 'BKN' || sky === 'OVC') {
      return '☁️';
    }
  }
  
  // Fallback based on time of day
  return isNight ? '🌙' : '🌤️';
};

// Convert METAR codes to Visual Crossing-style icon string (for consistency)
const metarToVCIcon = (skyc1: string | null, wxcodes: string | null, hour: number): string => {
  const isNight = hour < 6 || hour >= 20;
  
  if (wxcodes) {
    const wx = wxcodes.toUpperCase();
    if (wx.includes('TS')) return 'thunder-rain';
    if (wx.includes('SN')) return 'snow';
    if (wx.includes('RA') || wx.includes('DZ')) return 'rain';
    if (wx.includes('SH')) return isNight ? 'showers-night' : 'showers-day';
    if (wx.includes('FG') || wx.includes('BR')) return 'fog';
  }
  
  if (skyc1) {
    const sky = skyc1.toUpperCase();
    if (sky === 'CLR' || sky === 'SKC') return isNight ? 'clear-night' : 'clear-day';
    if (sky === 'FEW' || sky === 'SCT') return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
    if (sky === 'BKN' || sky === 'OVC') return 'cloudy';
  }
  
  return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
};

// Format hour for display
const formatHour = (date: Date): string => {
  const hour = date.getHours();
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
};

export default function WeatherLandingPage({
  stationId = 'PASI',
  stationName = 'Sitka, AK',
  location = 'Sitka,AK',
  apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000',
  visualCrossingApiKey,
  darkMode = true,
}: WeatherLandingPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentConditions, setCurrentConditions] = useState<VisualCrossingCurrent | null>(null);
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [nowIndex, setNowIndex] = useState(12);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Responsive handling
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all weather data
  const fetchWeatherData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Format dates for APIs
      const formatDateForApi = (d: Date) => d.toISOString().split('T')[0];
      const yesterdayStr = formatDateForApi(yesterday);
      const todayStr = formatDateForApi(now);
      const tomorrowStr = formatDateForApi(tomorrow);

      // Fetch historical data from your API (past 12+ hours)
      const historicalUrl = `${apiBaseUrl}/api/weather/hourly?station=${stationId}&start=${yesterdayStr}&end=${todayStr}`;
      
      // Fetch current + forecast from Visual Crossing
      const vcUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}/${todayStr}/${tomorrowStr}?unitGroup=us&include=hours,current&key=${visualCrossingApiKey}`;

      // Parallel fetch
      const [historicalRes, vcRes] = await Promise.all([
        fetch(historicalUrl).catch(() => null),
        fetch(vcUrl),
      ]);

      // Parse Visual Crossing response
      if (!vcRes.ok) {
        throw new Error('Failed to fetch forecast data');
      }
      const vcData = await vcRes.json();
      setCurrentConditions(vcData.currentConditions);

      // Build timeline
      const timeline: TimelinePoint[] = [];

      // Process historical data (past 12 hours)
      if (historicalRes && historicalRes.ok) {
        const historicalData: HourlyWeather[] = await historicalRes.json();
        
        // Filter to last 12 hours
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const recentHistorical = historicalData.filter(h => {
          const ts = new Date(h.ts_local);
          return ts >= twelveHoursAgo && ts < now;
        });

        recentHistorical.forEach(h => {
          const ts = new Date(h.ts_local);
          const hour = ts.getHours();
          timeline.push({
            time: ts,
            temp: Math.round(h.tmpf || 0),
            icon: metarToVCIcon(h.skyc1, h.wxcodes, hour),
            label: formatHour(ts),
            isPast: true,
            isCurrent: false,
          });
        });
      }

      // Add current conditions
      const currentIndex = timeline.length;
      timeline.push({
        time: now,
        temp: Math.round(vcData.currentConditions?.temp || 0),
        icon: vcData.currentConditions?.icon || 'cloudy',
        label: 'Now',
        isPast: false,
        isCurrent: true,
      });

      // Add forecast (next 12 hours)
      const allHours: { hour: VisualCrossingHour; date: string }[] = [];
      vcData.days?.forEach((day: { datetime: string; hours: VisualCrossingHour[] }) => {
        day.hours?.forEach((hour: VisualCrossingHour) => {
          allHours.push({ hour, date: day.datetime });
        });
      });

      const futureHours = allHours
        .map(({ hour, date }) => ({
          ...hour,
          datetime: new Date(`${date}T${hour.datetime}`),
        }))
        .filter(h => h.datetime > now)
        .slice(0, 12);

      futureHours.forEach(h => {
        timeline.push({
          time: h.datetime,
          temp: Math.round(h.temp),
          icon: h.icon,
          label: formatHour(h.datetime),
          isPast: false,
          isCurrent: false,
        });
      });

      setTimelineData(timeline);
      setNowIndex(currentIndex);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weather data');
      setLoading(false);
    }
  }, [stationId, location, apiBaseUrl, visualCrossingApiKey]);

  useEffect(() => {
    fetchWeatherData();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeatherData]);

  // ECharts configuration
  const getChartOption = () => {
    if (timelineData.length === 0) return {};

    const temps = timelineData.map(d => d.temp);
    const minTemp = Math.min(...temps) - 3;
    const maxTemp = Math.max(...temps) + 3;

    return {
      backgroundColor: 'transparent',
      
      grid: {
        top: 40,
        right: 20,
        bottom: 40,
        left: 45,
        containLabel: false,
      },

      xAxis: {
        type: 'category',
        data: timelineData.map(d => d.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: darkMode ? '#64748b' : '#94a3b8',
          fontSize: isMobile ? 9 : 10,
          interval: isMobile ? 3 : 2,
        },
      },

      yAxis: {
        type: 'value',
        min: minTemp,
        max: maxTemp,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: darkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(200, 200, 200, 0.3)',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: darkMode ? '#64748b' : '#94a3b8',
          fontSize: 10,
          formatter: '{value}°',
        },
      },

      tooltip: {
        trigger: 'axis',
        backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: darkMode ? 'rgba(99, 102, 241, 0.3)' : '#e0e0e0',
        borderWidth: 1,
        padding: 12,
        textStyle: {
          color: darkMode ? '#f1f5f9' : '#333',
          fontSize: 13,
        },
        formatter: (params: any) => {
          const idx = params[0].dataIndex;
          const point = timelineData[idx];
          const icon = getWeatherIcon(point.icon);
          const status = point.isCurrent ? 'Current' : point.isPast ? 'Recorded' : 'Forecast';
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 20px;">${icon}</span>
              <span style="font-weight: 600; font-size: 16px;">${point.temp}°F</span>
            </div>
            <div style="font-size: 11px; color: ${darkMode ? '#94a3b8' : '#666'};">${status}</div>
          `;
        },
      },

      series: [
        // Area fill
        {
          type: 'line',
          data: temps,
          smooth: 0.4,
          symbol: 'none',
          lineStyle: { width: 0 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: darkMode ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)' },
              { offset: 0.5, color: darkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(34, 211, 238, 0.15)' },
              { offset: 1, color: darkMode ? 'rgba(251, 191, 36, 0.05)' : 'rgba(251, 191, 36, 0.05)' },
            ]),
          },
          z: 1,
        },
        // Temperature line
        {
          type: 'line',
          data: temps,
          smooth: 0.4,
          symbol: 'circle',
          symbolSize: (_value: number, params: any) => {
            return timelineData[params.dataIndex]?.isCurrent ? 12 : 0;
          },
          itemStyle: {
            color: '#22d3ee',
            borderColor: darkMode ? '#0f172a' : '#fff',
            borderWidth: 3,
          },
          lineStyle: {
            width: 2.5,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#818cf8' },
              { offset: 0.5, color: '#22d3ee' },
              { offset: 1, color: '#fbbf24' },
            ]),
          },
          z: 2,
        },
        // "Now" marker line
        {
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#22d3ee',
              width: 2,
              type: 'dashed',
            },
            label: {
              show: true,
              position: 'start',
              formatter: 'NOW',
              color: '#22d3ee',
              fontSize: 9,
              fontWeight: 'bold',
            },
            data: [{ xAxis: nowIndex }],
          },
          data: [],
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className={`weather-landing ${darkMode ? 'dark' : 'light'}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`weather-landing ${darkMode ? 'dark' : 'light'}`}>
        <div className="error-container">
          <p className="error-text">⚠️ {error}</p>
          <button onClick={fetchWeatherData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`weather-landing ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className="landing-header">
        <div className="location-badge">
          <span className="location-icon">📍</span>
          <span className="location-text">{stationName}</span>
        </div>
        <p className="update-time">
          Updated {lastUpdate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      </header>

      {/* Current Conditions Hero */}
      <section className="hero-section">
        <div className="current-temp">
          <span className="temp-icon">{getWeatherIcon(currentConditions?.icon)}</span>
          <span className="temp-value">{Math.round(currentConditions?.temp || 0)}°</span>
        </div>
        <p className="conditions">{currentConditions?.conditions || 'Unknown'}</p>
        <div className="details-row">
          <span className="detail">💧 {Math.round(currentConditions?.humidity || 0)}%</span>
          <span className="detail-divider">•</span>
          <span className="detail">💨 {Math.round(currentConditions?.windspeed || 0)} mph</span>
          <span className="detail-divider">•</span>
          <span className="detail">🌡️ Feels {Math.round(currentConditions?.feelslike || 0)}°</span>
        </div>
      </section>

      {/* 24-Hour Timeline Chart */}
      <section className="chart-section">
        <div className="chart-header">
          <h2 className="chart-title">24-Hour Timeline</h2>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot past"></span>
              Historical
            </span>
            <span className="legend-item">
              <span className="legend-dot now"></span>
              Now
            </span>
            <span className="legend-item">
              <span className="legend-dot forecast"></span>
              Forecast
            </span>
          </div>
        </div>

        {/* Weather icons strip */}
        <div className="icon-strip">
          {timelineData.filter((_, i) => i % (isMobile ? 3 : 2) === 0).map((point, idx) => (
            <span
              key={idx}
              className={`icon-item ${point.isCurrent ? 'current' : ''}`}
            >
              {getWeatherIcon(point.icon)}
            </span>
          ))}
        </div>

        <div className="chart-container">
          <ReactECharts
            option={getChartOption()}
            style={{ height: '200px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        </div>
      </section>

      {/* Hourly Cards */}
      <section className="hourly-section">
        <h3 className="section-title">Next 12 Hours</h3>
        <div className="hourly-scroll">
          {timelineData.slice(nowIndex).map((hour, idx) => (
            <div
              key={idx}
              className={`hour-card ${hour.isCurrent ? 'current' : ''}`}
            >
              <span className="hour-time">{hour.label}</span>
              <span className="hour-icon">{getWeatherIcon(hour.icon)}</span>
              <span className="hour-temp">{hour.temp}°</span>
            </div>
          ))}
        </div>
      </section>

      {/* Attribution */}
      <footer className="landing-footer">
        <p className="attribution">
          Historical data from station observations • Forecast by Visual Crossing
        </p>
      </footer>
    </div>
  );
}
