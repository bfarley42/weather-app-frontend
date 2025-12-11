// src/components/WeatherLandingPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './WeatherLandingPage.css';
// import nightPartlyCloudy from '../assets/weather/partly_cloudy_night.svg';
import { WeatherIcon } from "./WeatherIcons";
// import type { WeatherIconType } from "./WeatherIcons";

interface WeatherLandingPageProps {
  stationId?: string;
  stationName?: string;
  lat: number;
  lon: number;
  apiBaseUrl?: string; // e.g. https://weather-api-huq7.onrender.com
  darkMode?: boolean;
}

interface TimelinePoint {
  time: Date;
  source: 'station' | 'openmeteo';
  temp: number | null;
  feelsLike: number | null;
  precipAmountIn: number | null;
  precipProbPct: number | null;
  humidityPct: number | null;
  windMph: number | null;
  conditions: string;
  icon: string;
  isPast: boolean;
  isCurrent: boolean;
}

interface CurrentConditions {
  temp: number;
  feelsLike: number | null;
  windspeed: number | null;
  humidity: number | null;
  description: string;
  icon: string;
}

interface StationHourlyRow {
  ts_local: string;          // "2025-12-10T00:00:00"
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  relh_pct: number | null;
  max_gust_mph: number | null;
  feelslike_f: number | null;
  skyc1: string | null;
  wxcodes: string | null;
}

// --- Helpers ----------------------------------------------------

const formatHour = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric' });

const formatShortDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Will be set dynamically from Open-Meteo daily data
let sunriseHour = 8;  // default fallback
let sunsetHour = 17;  // default fallback

// const isNightHour = (date: Date) => {
//   const h = date.getHours();
//   return h < sunriseHour || h >= sunsetHour;
// };

const hourKey = (d: Date) => {
  // Round to the hour and key as YYYY-MM-DDTHH (local)
  const iso = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    0,
    0,
    0
  ).toISOString();
  return iso.slice(0, 13); // YYYY-MM-DDTHH
};

// function renderIcon(icon: string) {
//   const isImage =
//     icon.startsWith("data:image") ||
//     icon.endsWith(".svg") ||
//     icon.endsWith(".png");

//   if (isImage) {
//     return (
//       <img
//         src={icon}
//         alt=""
//         style={{ width: 28, height: 28, objectFit: "contain" }}
//       />
//     );
//   }

//   // Otherwise it's an emoji
//   return icon;
// }


// Open-Meteo weathercode → icon/description
// const mapWeatherCodeToIcon = (code?: number, isNight?: boolean): string => {
//   if (code == null) return isNight ? '🌙' : '🌤️';
//   const night = !!isNight;

//   // Clear
//   if (code === 0) return night ? '🌙' : '☀️';
//   // Mainly clear - use moon for night
//   if (code === 1) return night ? '🌙' : '🌤️';
//   // Partly cloudy - ideally moon+cloud but emoji limited, use 🌙 with note
//   if (code === 2) return night ? '☁️' : '⛅';  // or consider using text indicator
//   // Overcast
//   if (code === 3) return '☁️';
//   // Drizzle
//   if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
//   // Rain
//   if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
//   // Snow
//   if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
//   // Thunderstorm
//   if ([95, 96, 99].includes(code)) return '⛈️';
//   // Fog
//   if ([45, 48].includes(code)) return '🌫️';
//   return night ? '🌙' : '🌤️';
// };

// Open-Meteo weathercode → icon type
const mapWeatherCodeToIcon = (code?: number, isNight?: boolean): string => {
  if (code == null) return isNight ? 'clear-night' : 'partly-cloudy-day';
  const night = !!isNight;

  // Clear
  if (code === 0) return night ? 'clear-night' : 'clear-day';
  // Mainly clear
  if (code === 1) return night ? 'few-clouds-night' : 'clear-day';
  // Partly cloudy
  if (code === 2) return night ? 'partly-cloudy-night' : 'partly-cloudy-day';
  // Overcast
  if (code === 3) return 'overcast';
  // Drizzle / light rain
  if ([51, 53, 55, 56, 57].includes(code)) return 'rain';
  // Rain
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  // Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  // Thunderstorm
  if ([95, 96, 99].includes(code)) return 'thunderstorm';
  // Fog
  if ([45, 48].includes(code)) return 'fog';
  
  return night ? 'clear-night' : 'partly-cloudy-day';
};

const mapWeatherCodeToDescription = (code?: number): string => {
  if (code == null) return 'Unknown';
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([51, 53, 55].includes(code)) return 'Drizzle';
  if ([56, 57].includes(code)) return 'Freezing drizzle';
  if ([61, 63, 65].includes(code)) return 'Rain';
  if ([66, 67].includes(code)) return 'Freezing rain';
  if ([71, 73, 75].includes(code)) return 'Snow';
  if (code === 77) return 'Snow grains';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([85, 86].includes(code)) return 'Snow showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  if ([45, 48].includes(code)) return 'Fog';
  return 'Mixed conditions';
};

// Station skyc1 → icon/description (with night support)
// const mapSkyc1ToIcon = (skyc1?: string | null, isNight?: boolean): { icon: string; desc: string } => {
//   const night = !!isNight;
//   if (!skyc1) return { icon: night ? '🌙' : '🌤️', desc: 'Unknown' };
//   const s = skyc1.toUpperCase();
  
//   // Clear sky
//   if (s === 'CLR' || s === 'SKC') {
//     return { icon: night ? '🌙' : '☀️', desc: night ? 'Clear night' : 'Clear' };
//   }
//   // Few clouds (1-2 oktas) - mostly clear
//   if (s === 'FEW') {
//     return { icon: night ? '🌙' : '🌤️', desc: night ? 'Mostly clear' : 'Few clouds' };
//   }
//   // Scattered clouds (3-4 oktas)
//   if (s === 'SCT') {
//     return { icon: night ? '🌙' : '⛅', desc: 'Scattered clouds' };
//   }
//   // Broken clouds (5-7 oktas)
//   if (s === 'BKN') {
//     return { icon: '🌥️', desc: 'Broken clouds' };
//   }
//   // Overcast (8 oktas)
//   if (s === 'OVC') {
//     return { icon: '☁️', desc: 'Overcast' };
//   }
//   return { icon: night ? '🌙' : '🌤️', desc: skyc1 };
// };

// Station skyc1 → icon type + description
const mapSkyc1ToIcon = (skyc1?: string | null, isNight?: boolean): { icon: string; desc: string } => {
  const night = !!isNight;
  if (!skyc1) return { icon: night ? 'clear-night' : 'partly-cloudy-day', desc: 'Unknown' };
  const s = skyc1.toUpperCase();
  
  if (s === 'CLR' || s === 'SKC') {
    return { icon: night ? 'clear-night' : 'clear-day', desc: night ? 'Clear night' : 'Clear' };
  }
  if (s === 'FEW') {
    return { icon: night ? 'few-clouds-night' : 'clear-day', desc: night ? 'Mostly clear' : 'Few clouds' };
  }
  if (s === 'SCT') {
    return { icon: night ? 'partly-cloudy-night' : 'partly-cloudy-day', desc: 'Scattered clouds' };
  }
  if (s === 'BKN') {
    return { icon: night ? 'partly-cloudy-night' : 'cloudy', desc: 'Broken clouds' };
  }
  if (s === 'OVC') {
    return { icon: 'overcast', desc: 'Overcast' };
  }
  return { icon: night ? 'clear-night' : 'partly-cloudy-day', desc: skyc1 };
};


export default function WeatherLandingPage({
  stationId = 'PASI',
  stationName = 'Sitka, AK',
  lat,
  lon,
  apiBaseUrl,
  darkMode = true,
}: WeatherLandingPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions | null>(null);
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [tooltip, setTooltip] = useState<{
    point: TimelinePoint;
    left: number;
  } | null>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const hourlySectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

    // Scroll hourly strip to center on "Now" card
  useEffect(() => {
    if (!timelineData.length) return;
    
    const currentIdx = timelineData.findIndex(p => p.isCurrent);
    if (currentIdx < 0) return;

    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const scrollContainer = document.querySelector('.hourly-scroll');
      const currentCard = scrollContainer?.children[currentIdx] as HTMLElement;
      
      if (scrollContainer && currentCard) {
        const containerWidth = scrollContainer.clientWidth;
        const cardLeft = currentCard.offsetLeft;
        const cardWidth = currentCard.offsetWidth;
        
        // Scroll so the current card is centered
        scrollContainer.scrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [timelineData]);

  const fetchWeatherData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const pastWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const futureWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 1) Fetch Open-Meteo (current + hourly, F units, with precip prob)
      const omUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}` +
        `&longitude=${lon}` +
        `&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,weathercode,relative_humidity_2m,wind_speed_10m` +
        `&daily=sunrise,sunset` +
        `&current_weather=true` +
        `&temperature_unit=fahrenheit` +
        `&windspeed_unit=mph` +
        `&precipitation_unit=inch` +
        `&past_days=1` +
        `&forecast_days=2` +
        `&timezone=auto`;

      const omRes = await fetch(omUrl);
      if (!omRes.ok) throw new Error('Failed to fetch forecast from Open-Meteo');
      const omData = await omRes.json();

      const hourly = omData.hourly as {
        time: string[];
        temperature_2m: number[];
        apparent_temperature: number[];
        precipitation: number[];
        precipitation_probability: number[];
        weathercode: number[];
        relative_humidity_2m: number[];
        wind_speed_10m: number[];
      };

      const currentOm = omData.current_weather as {
        temperature: number;
        windspeed: number;
        weathercode: number;
        time: string;
      };

            // Extract sunrise/sunset for today to determine night hours
// Extract sunrise/sunset for today and yesterday
      const daily = omData.daily as {
        sunrise?: string[];
        sunset?: string[];
        time?: string[];
      };
      
      // Store sunrise/sunset by date string for lookup
      const sunTimes: Record<string, { sunrise: number; sunset: number }> = {};
      
      if (daily?.time && daily?.sunrise && daily?.sunset) {
        daily.time.forEach((dateStr, i) => {
          if (daily.sunrise?.[i] && daily.sunset?.[i]) {
            const sunriseDate = new Date(daily.sunrise[i]);
            const sunsetDate = new Date(daily.sunset[i]);
            sunTimes[dateStr] = {
              sunrise: sunriseDate.getHours(),
              sunset: sunsetDate.getHours(),
            };
          }
        });
      }
      
      // Fallback to today's times for the global variables (used by current conditions)
      if (daily?.sunrise?.[1] && daily?.sunset?.[1]) {
        const todaySunrise = new Date(daily.sunrise[1]);
        const todaySunset = new Date(daily.sunset[1]);
        sunriseHour = todaySunrise.getHours();
        sunsetHour = todaySunset.getHours();
      }
      
      // Helper to check if a specific datetime is night
      const isNightAt = (date: Date): boolean => {
        const dateStr = date.toISOString().slice(0, 10);
        const times = sunTimes[dateStr];
        const hour = date.getHours();
        if (times) {
          return hour < times.sunrise || hour >= times.sunset;
        }
        // Fallback to global sunrise/sunset
        return hour < sunriseHour || hour >= sunsetHour;
      };

      // Build base timeline from Open-Meteo within [pastWindowStart, futureWindowEnd]
      const pointsByKey: Record<string, TimelinePoint> = {};

      if (hourly && hourly.time?.length) {
        for (let i = 0; i < hourly.time.length; i++) {
          const t = new Date(hourly.time[i]);
          if (t < pastWindowStart || t > futureWindowEnd) continue;

          const k = hourKey(t);
          const temp = hourly.temperature_2m[i];
          const feelsLike = hourly.apparent_temperature?.[i] ?? temp;
          const precipAmt = hourly.precipitation?.[i] ?? null;
          const precipProb = hourly.precipitation_probability?.[i] ?? null;
          const rh = hourly.relative_humidity_2m?.[i] ?? null;
          const wind = hourly.wind_speed_10m?.[i] ?? null;
          const code = hourly.weathercode?.[i];

          pointsByKey[k] = {
            time: t,
            source: 'openmeteo',
            temp,
            feelsLike,
            precipAmountIn: precipAmt,
            precipProbPct: precipProb,
            humidityPct: rh,
            windMph: wind,
            conditions: mapWeatherCodeToDescription(code),
            icon: mapWeatherCodeToIcon(code, isNightAt(t)),
            isPast: t < now,
            isCurrent: false,
          };
        }
      }

      // 2) Fetch station hourly for past 24h if API base provided
      if (apiBaseUrl && stationId) {
        const startDateStr = pastWindowStart.toISOString().slice(0, 10);
        const endDateStr = now.toISOString().slice(0, 10);

        const stationUrl = `${apiBaseUrl}/api/weather/hourly?station=${stationId}&start=${startDateStr}&end=${endDateStr}`;
        const stationRes = await fetch(stationUrl);
        if (stationRes.ok) {
          const stationData: StationHourlyRow[] = await stationRes.json();

          for (const row of stationData) {
            if (!row.ts_local) continue;
            const t = new Date(row.ts_local); // already local time
            if (t > now || t < pastWindowStart) continue;

            // Only override if station has valid temperature data
            if (row.tmpf == null) continue;

            const k = hourKey(t);
            const { icon, desc } = mapSkyc1ToIcon(row.skyc1, isNightAt(t));

            // Override Open-Meteo with station data for past hours (only if we have temp)
            pointsByKey[k] = {
              time: t,
              source: 'station',
              temp: row.tmpf,
              feelsLike: row.feelslike_f ?? row.tmpf,
              precipAmountIn: row.precip_in,
              precipProbPct: null, // station doesn't provide prob
              humidityPct: row.relh_pct,
              windMph: row.avg_wspd_mph,
              conditions: desc,
              icon,
              isPast: t < now,
              isCurrent: false,
            };
          }
        }
      }

      // 3) Build sorted array and mark current hour
      const allPoints = Object.values(pointsByKey).sort(
        (a, b) => a.time.getTime() - b.time.getTime()
      );

      // Ensure isPast/isCurrent flags
      let bestIdx = -1;
      let bestDiff = Infinity;
      allPoints.forEach((p, idx) => {
        p.isPast = p.time < now;
        const diff = Math.abs(p.time.getTime() - now.getTime());
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });
      if (bestIdx >= 0) {
        allPoints[bestIdx].isCurrent = true;
        allPoints[bestIdx].isPast = false;
      }

// 4) Current conditions – use consistent source for icon and description
      let cc: CurrentConditions | null = null;
      if (bestIdx >= 0) {
        const p = allPoints[bestIdx];
        // Use Open-Meteo for description/icon if it's the source, otherwise use station data
        // This ensures icon and description always match
        const useOpenMeteo = p.source === 'openmeteo' || !p.conditions || p.conditions === 'Unknown';
        
        let finalIcon: string;
        let finalDesc: string;
        
        if (useOpenMeteo) {
          finalDesc = mapWeatherCodeToDescription(currentOm.weathercode);
          finalIcon = mapWeatherCodeToIcon(currentOm.weathercode, isNightAt(p.time));
        } else {
          finalDesc = p.conditions;
          finalIcon = p.icon;
        }
        
        cc = {
          temp: p.temp ?? currentOm.temperature,
          feelsLike: p.feelsLike ?? null,
          windspeed: p.windMph ?? currentOm.windspeed ?? null,
          humidity: p.humidityPct ?? null,
          description: finalDesc,
          icon: finalIcon,
        };
      } else {
        const currentTime = new Date(currentOm.time);
        cc = {
          temp: currentOm.temperature,
          feelsLike: null,
          windspeed: currentOm.windspeed ?? null,
          humidity: null,
          description: mapWeatherCodeToDescription(currentOm.weathercode),
          icon: mapWeatherCodeToIcon(currentOm.weathercode, isNightAt(currentTime)),
        };
      }

      setCurrentConditions(cc);
      setTimelineData(allPoints);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load weather');
      setLoading(false);
    }
  }, [lat, lon, apiBaseUrl, stationId]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // --- Chart option --------------------------------------------

  const getChartOption = (): echarts.EChartsOption => {
    if (!timelineData.length) {
      return {
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
      };
    }
    const currentIdx = timelineData.findIndex(p => p.isCurrent);
    const temps = timelineData.map((p) =>
      p.temp != null ? p.temp : NaN
    );
    const minTemp = Math.floor(Math.min(...temps.filter((v) => !Number.isNaN(v))) - 1);
    const maxTemp = Math.ceil(Math.max(...temps.filter((v) => !Number.isNaN(v))) + 1);

    const xData = timelineData.map((p) => p.time.toISOString());
    const currentPoint = timelineData.find((p) => p.isCurrent);

    return {
      backgroundColor: 'transparent',
      grid: {
        left: isMobile ? 32 : 40,
        right: isMobile ? 12 : 20,
        top: 35,
        bottom: 50,  // Increased from 30 to make room for slider
      },
    tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0];
          const idx = p.dataIndex;
          const point = timelineData[idx];
          const timeLabel = point.isCurrent 
            ? 'Now' 
            : point.time.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric',
                minute: '2-digit'
              });
          const precipAmt = point.precipAmountIn != null
            ? `${point.precipAmountIn.toFixed(2)} in`
            : '—';
          const precipProb = point.precipProbPct != null
            ? `${Math.round(point.precipProbPct)}%`
            : '—';

          return `
            <div>
              <div><strong>${timeLabel}</strong></div>
              <div>${point.temp != null ? `${Math.round(point.temp)}°F` : '--'}</div>
              <div>Feels like: ${
                point.feelsLike != null ? `${Math.round(point.feelsLike)}°F` : '--'
              }</div>
              <div>${point.conditions}</div>
              <div>Precip: ${precipAmt} (${precipProb})</div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: darkMode ? '#64748b' : '#64748b',
          fontSize: isMobile ? 9 : 10,
          formatter: (value: string) => {
            const d = new Date(value);
            return formatHour(d);
          },
          interval: isMobile ? 2 : 1,
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
            color: darkMode
              ? 'rgba(148, 163, 184, 0.3)'
              : 'rgba(148, 163, 184, 0.3)',
          },
        },
        axisLabel: {
          color: darkMode ? '#64748b' : '#64748b',
          fontSize: isMobile ? 9 : 10,
          formatter: '{value}°',
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: Math.max(0, ((currentIdx - 12) / timelineData.length) * 100),
          end: Math.min(100, ((currentIdx + 12) / timelineData.length) * 100),
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 20,
          bottom: 5,
          start: Math.max(0, ((currentIdx - 12) / timelineData.length) * 100),
          end: Math.min(100, ((currentIdx + 12) / timelineData.length) * 100),
          handleSize: '80%',
          showDetail: false,
          borderColor: 'transparent',
          backgroundColor: darkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)',
          fillerColor: darkMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        },
      ],
series: [
        {
          name: 'Temperature',
          type: 'line',
          data: temps,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: darkMode ? '#60a5fa' : '#3b82f6',
          },
          areaStyle: {
            opacity: 0.9,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: darkMode
                  ? 'rgba(99, 102, 241, 0.4)'
                  : 'rgba(99, 102, 241, 0.3)',
              },
              {
                offset: 0.5,
                color: darkMode
                  ? 'rgba(34, 211, 238, 0.2)'
                  : 'rgba(34, 211, 238, 0.15)',
              },
              {
                offset: 1,
                color: darkMode
                  ? 'rgba(251, 191, 36, 0.05)'
                  : 'rgba(251, 191, 36, 0.05)',
              },
            ]),
          },
          // "Now" vertical line with formatted label
          markLine: currentPoint
            ? {
                symbol: 'none',
                data: [
                  {
                    xAxis: currentIdx,
                    label: {
                      show: true,
                      position: 'start',
                      formatter: () => {
                        const d = currentPoint.time;
                        return d.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                        });
                      },
                      color: '#38bdf8',
                      fontSize: isMobile ? 9 : 11,
                      fontWeight: 'bold',
                      backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                      padding: [2, 6],
                      borderRadius: 3,
                    },
                  },
                ],
                lineStyle: {
                  color: '#38bdf8',
                  width: 2,
                  type: 'dashed',
                },
              }
            : undefined,
          // Dynamic High/Low markers - auto-update when scrolling!
          markPoint: {
            data: [
              {
                type: 'max',
                name: 'High',
                label: {
                  show: true,
                  formatter: (params: any) => `High ${Math.round(params.value)}°`,
                  position: 'top',
                  color: darkMode ? '#fff' : '#fff',
                  fontSize: isMobile ? 9 : 11,
                  fontWeight: 'bold',
                  backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.85)' : 'rgba(220, 38, 38, 0.8)',
                  padding: [2, 6],
                  borderRadius: 4,
                },
                symbolSize: isMobile ? 6 : 8,
                itemStyle: { color: '#ef4444' },
              },
              {
                type: 'min',
                name: 'Low',
                label: {
                  show: true,
                  formatter: (params: any) => `Low ${Math.round(params.value)}°`,
                  position: 'bottom',
                  color: darkMode ? '#fff' : '#fff',
                  fontSize: isMobile ? 9 : 11,
                  fontWeight: 'bold',
                  backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.85)' : 'rgba(37, 99, 235, 0.8)',
                  padding: [2, 6],
                  borderRadius: 4,
                },
                symbolSize: isMobile ? 6 : 8,
                itemStyle: { color: '#3b82f6' },
              },
            ],
          },
        } as echarts.LineSeriesOption,
      ],
    };
  };

  // --- Hourly tooltip on tap (Yahoo-style bubble) ---------------

  const showHourlyTooltip = (point: TimelinePoint, e: React.MouseEvent<HTMLDivElement>) => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    const cardEl = e.currentTarget;
    const sectionEl = hourlySectionRef.current;
    if (!sectionEl) return;

    const cardRect = cardEl.getBoundingClientRect();
    const sectionRect = sectionEl.getBoundingClientRect();
    const left = cardRect.left - sectionRect.left + cardRect.width / 2;

    setTooltip({ point, left });

    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip(null);
    }, 2500);
  };

  const now = new Date();

  if (loading && !currentConditions) {
    return (
      <div className={`weather-landing ${darkMode ? 'dark' : 'light'}`}>
        <div className="loading-message">Loading weather…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`weather-landing ${darkMode ? 'dark' : 'light'}`}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div
      className={`weather-landing ${darkMode ? 'dark' : 'light'}`}
      onClick={() => {
        // Click anywhere outside cards dismisses tooltip
        if (tooltip) setTooltip(null);
      }}
    >
      {/* Header */}
      <header className="landing-header">
        <div className="location-row">
          <div className="location-main">
            <span className="location-icon">📍</span>
            <div className="location-text-block">
              <div className="location-name">{stationName}</div>
              <div className="location-sub">
                {formatShortDate(now)} ·{' '}
                {lastUpdate
                  ? `Updated ${lastUpdate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : ''}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Current Conditions Hero */}
      <section className="hero-section">
        <div className="hero-main">
          <div className="hero-left">
            <div className="hero-temp">
              <span className="hero-temp-value">
                {currentConditions ? Math.round(currentConditions.temp) : '--'}°
              </span>
              <span className="hero-temp-unit">F</span>
            </div>
            <div className="hero-description">
              {currentConditions?.description || 'Current conditions'}
            </div>
            <div className="hero-feels">
              Feels like{' '}
              {currentConditions?.feelsLike != null
                ? `${Math.round(currentConditions.feelsLike)}°`
                : '--'}
            </div>
          </div>
          <div className="hero-right">
            {/* <div className="hero-icon">{currentConditions?.icon || '🌤️'}</div> */}
            <div className="hero-icon">
            < WeatherIcon type={currentConditions?.icon || 'partly-cloudy-day'} size={48} />
          </div>
            <div className="hero-details">
              <div className="hero-detail-row">
                <span>Wind</span>
                <span>
                  {currentConditions?.windspeed != null
                    ? `${Math.round(currentConditions.windspeed)} mph`
                    : '--'}
                </span>
              </div>
              <div className="hero-detail-row">
                <span>Humidity</span>
                <span>
                  {currentConditions?.humidity != null
                    ? `${Math.round(currentConditions.humidity)}%`
                    : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly strip – unified past+future with scroll */}
      <section className="hourly-section" ref={hourlySectionRef}>
        <div className="section-header">
          <h2>Past & Next 24 hours</h2>
        </div>

        {/* Tooltip bubble */}
        {tooltip && (
          <div
            className="hourly-tooltip"
            style={{ left: tooltip.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tooltip-time">
              {tooltip.point.isCurrent ? 'Now' : formatHour(tooltip.point.time)}
            </div>
            <div className="tooltip-main">
              {/* <span className="tooltip-icon">{tooltip.point.icon}</span> */}
              <span className="tooltip-icon">
                <WeatherIcon type={tooltip.point.icon} size={24} />
              </span>
              <span className="tooltip-temp">
                {tooltip.point.temp != null ? `${Math.round(tooltip.point.temp)}°F` : '--'}
              </span>
            </div>
            <div className="tooltip-row">
              Feels like:{' '}
              {tooltip.point.feelsLike != null
                ? `${Math.round(tooltip.point.feelsLike)}°`
                : '--'}
            </div>
            <div className="tooltip-row">{tooltip.point.conditions}</div>
            <div className="tooltip-row">
              Precip:{' '}
              {tooltip.point.precipAmountIn != null
                ? `${tooltip.point.precipAmountIn.toFixed(2)} in`
                : '—'}{' '}
              {tooltip.point.precipProbPct != null
                ? `(${Math.round(tooltip.point.precipProbPct)}%)`
                : ''}
            </div>
          </div>
        )}

        <div className="hourly-scroll">
          {timelineData.map((p, idx) => (
            <div
              key={idx}
              className={`hour-card ${p.isCurrent ? 'current' : ''} ${
                p.isPast ? 'past' : 'future'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                showHourlyTooltip(p, e);
              }}
            >
              <div className="hour-time">
                {p.isCurrent ? 'Now' : formatHour(p.time)}
              </div>
              {/* <div className="hour-icon">{p.icon}</div> */}
              <div className="hour-icon">
              <WeatherIcon type={p.icon} size={22} />
            </div>  
              <div className="hour-temp">
                {p.temp != null ? `${Math.round(p.temp)}°` : '--'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Temperature chart */}
      <section className="chart-section">
        <div className="section-header">
          <h2>Temperature trend</h2>
        </div>
        <div className="chart-container">
          <ReactECharts
            option={getChartOption()}
            style={{ height: isMobile ? '220px' : '240px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </section>

      {/* Footer / attribution */}
      <footer className="landing-footer">
        <p className="attribution">
          Past data: station {stationId} · Forecast: Open-Meteo.org
        </p>
      </footer>
    </div>
  );
}
