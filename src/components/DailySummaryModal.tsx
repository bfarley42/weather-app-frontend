// src/components/DailySummaryModal.tsx
/**
 * Modal showing daily weather summary
 * - 6 clickable stat cards (temp, sunshine, precip, clouds, wind, humidity)
 * - Each card opens the corresponding detail modal for that specific day
 * - Apple Weather style layout
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Cloud, Wind, Droplets, Thermometer } from 'lucide-react';
import { FaThermometerHalf } from 'react-icons/fa';
import { API_URL } from '../config';
import './DailySummaryModal.css';

// Sub-modals (we'll pass date to filter their data)
import SunshineModal from './SunshineModal';
import CloudCoverModal from './CloudCoverModal';
import WindModal from './WindModal';
import HumidityModal from './HumidityModal';
import DewPointModal from './DewPointModal';
import HourlyPrecipModal from './HourlyPrecipModal';

interface DailyData {
  date: string;
  day_label: string;
  high_f: number | null;
  low_f: number | null;
  normal_high_f: number | null;
  normal_low_f: number | null;
  precip_in: number | null;
  dominant_condition: string | null;
  sky_code: string | null;
}

interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  dwpf: number | null;
  relh_pct: number | null;
  skyc1: string | null;
  wxcodes: string | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  max_gust_mph: number | null;
}

interface SunTimes {
  sunrise: string | null;
  sunset: string | null;
}

interface DailySummaryModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  dayData: DailyData | null;
  sunTimes?: SunTimes | null;
}

export default function DailySummaryModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  dayData,
  sunTimes,
}: DailySummaryModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sub-modal states
  const [showSunshineModal, setShowSunshineModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showWindModal, setShowWindModal] = useState(false);
  const [showHumidityModal, setShowHumidityModal] = useState(false);
  const [showDewPointModal, setShowDewPointModal] = useState(false);
  const [showPrecipModal, setShowPrecipModal] = useState(false);

  // Fetch hourly data for the specific day
  useEffect(() => {
    if (!isOpen || !stationId || !dayData?.date) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Guard Clause: Stop immediately if dayData doesn't exist
        if (!dayData) {
            return; // Or set an empty state/loading state if needed
        }
        // Fetch hourly data for this specific date
        const response = await fetch(
          `${API_URL}/api/weather/hourly-day?station=${stationId}&date=${dayData.date}`
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
  }, [isOpen, stationId, dayData?.date]);

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

  if (!isOpen || !dayData) return null;

  // Calculate summary stats from hourly data
  const calculateStats = () => {
    if (!hourlyData.length) {
      return {
        avgWind: null,
        maxGust: null,
        avgHumidity: null,
        avgDewPoint: null,
        sunshineHours: null,
        sunshinePct: null,
        cloudCoverPct: null,
        totalPrecip: dayData.precip_in,
      };
    }

    // Wind
    const winds = hourlyData.map(h => h.avg_wspd_mph).filter((w): w is number => w !== null);
    const gusts = hourlyData.map(h => h.max_gust_mph).filter((g): g is number => g !== null);
    const avgWind = winds.length > 0 ? winds.reduce((a, b) => a + b, 0) / winds.length : null;
    const maxGust = gusts.length > 0 ? Math.max(...gusts) : null;

    // Humidity
    const humidities = hourlyData.map(h => h.relh_pct).filter((h): h is number => h !== null);
    const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;

    // Dew Point
    const dewPoints = hourlyData.map(h => h.dwpf).filter((d): d is number => d !== null);
    const avgDewPoint = dewPoints.length > 0 ? dewPoints.reduce((a, b) => a + b, 0) / dewPoints.length : null;

    // Precipitation
    const precips = hourlyData.map(h => h.precip_in).filter((p): p is number => p !== null);
    const totalPrecip = precips.length > 0 ? precips.reduce((a, b) => a + b, 0) : dayData.precip_in;

    // Sunshine & Cloud Cover
    const skyToCloudPct = (skyCode: string | null): number => {
      if (!skyCode) return 50;
      const code = skyCode.toUpperCase();
      switch (code) {
        case 'CLR': case 'SKC': return 0;
        case 'FEW': return 18;
        case 'SCT': return 44;
        case 'BKN': return 75;
        case 'OVC': return 100;
        default: return 50;
      }
    };

    const skyToSunshineFactor = (skyCode: string | null): number => {
      if (!skyCode) return 0.5;
      const code = skyCode.toUpperCase();
      switch (code) {
        case 'CLR': case 'SKC': return 1.0;
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
      if (wx.includes('sn')) return 0.05;
      if (wx.includes('fg')) return 0.15;
      return 1.0;
    };

    // Parse sunrise/sunset
    const parseTimeToHour = (timeStr: string | null): number => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hour = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour + minutes / 60;
    };

    const sunriseHour = parseTimeToHour(sunTimes?.sunrise ?? null);
    const sunsetHour = parseTimeToHour(sunTimes?.sunset ?? null);
    const daylightHours = sunsetHour - sunriseHour;

    let totalSunshine = 0;
    let totalCloudCover = 0;
    let daylightObservations = 0;

    hourlyData.forEach(h => {
      const hourDate = new Date(h.ts_local);
      const hourNum = hourDate.getHours();
      const isDaylight = hourNum >= Math.floor(sunriseHour) && hourNum < Math.ceil(sunsetHour);

      if (isDaylight) {
        const sunshineFactor = skyToSunshineFactor(h.skyc1);
        const attenuation = wxToAttenuation(h.wxcodes);
        totalSunshine += sunshineFactor * attenuation;
        daylightObservations++;
      }

      totalCloudCover += skyToCloudPct(h.skyc1);
    });

    const sunshineHours = Math.round(totalSunshine * 10) / 10;
    const sunshinePct = daylightObservations > 0 
      ? Math.round((totalSunshine / daylightObservations) * 100)
      : null;
    const cloudCoverPct = hourlyData.length > 0 
      ? Math.round(totalCloudCover / hourlyData.length)
      : null;

    return {
      avgWind,
      maxGust,
      avgHumidity,
      avgDewPoint,
      sunshineHours,
      sunshinePct,
      cloudCoverPct,
      totalPrecip,
    };
  };

  const stats = calculateStats();

  // Format the date nicely
  const formatDate = (dateStr: string, dayLabel: string): { main: string; sub: string } => {
    const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const formatted = date.toLocaleDateString('en-US', options);
    return {
      main: dayLabel,
      sub: formatted,
    };
  };

  const dateDisplay = formatDate(dayData.date, dayData.day_label);

  // Temperature difference from normal
  const getTempDiff = (): { diff: number; label: string } | null => {
    if (dayData.high_f === null || dayData.normal_high_f === null) return null;
    const avgActual = ((dayData.high_f ?? 0) + (dayData.low_f ?? 0)) / 2;
    const avgNormal = ((dayData.normal_high_f ?? 0) + (dayData.normal_low_f ?? 0)) / 2;
    const diff = avgActual - avgNormal;
    const label = diff >= 0 ? `+${Math.round(diff)}° above normal` : `${Math.round(diff)}° below normal`;
    return { diff, label };
  };

  const tempDiff = getTempDiff();

  // Get condition icon
  const getConditionEmoji = (condition: string | null): string => {
    if (!condition) return '🌤️';
    const c = condition.toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) return '☀️';
    if (c.includes('partly')) return '⛅';
    if (c.includes('cloud') || c.includes('overcast')) return '☁️';
    if (c.includes('rain')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('fog')) return '🌫️';
    if (c.includes('thunder')) return '⛈️';
    return '🌤️';
  };

  const modalContent = (
    <div 
      className={`daily-summary-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="daily-summary-modal">
        <button 
          className="daily-summary-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="daily-summary-modal-handle" />

        <div className="daily-summary-modal-content">
          {loading ? (
            <div className="daily-summary-loading">
              <div className="loading-spinner" />
              <span>Loading day summary...</span>
            </div>
          ) : error ? (
            <div className="daily-summary-error">
              <span>⚠️ {error}</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="daily-summary-header">
                <h2 className="daily-summary-title">{dateDisplay.main}</h2>
                <div className="daily-summary-subtitle">{dateDisplay.sub}</div>
                <div className="daily-summary-station">{stationName}</div>
              </div>

              {/* Dominant Condition Banner */}
              <div className="daily-summary-condition">
                <span className="condition-emoji">{getConditionEmoji(dayData.dominant_condition)}</span>
                <span className="condition-text">{dayData.dominant_condition || 'Unknown'}</span>
              </div>

              {/* Stats Grid - Row 1 */}
              <div className="daily-summary-grid">
                {/* Temperature Card */}
                <div className="daily-stat-card temp-card">
                  <Thermometer size={20} className="stat-card-icon temp-icon" />
                  <div className="stat-card-values">
                    <span className="stat-high">{dayData.high_f !== null ? `${Math.round(dayData.high_f)}°` : '--'}</span>
                    <span className="stat-separator">/</span>
                    <span className="stat-low">{dayData.low_f !== null ? `${Math.round(dayData.low_f)}°` : '--'}</span>
                  </div>
                  <div className="stat-card-label">HIGH / LOW</div>
                  {tempDiff && (
                    <div className={`stat-card-diff ${tempDiff.diff >= 0 ? 'warm' : 'cool'}`}>
                      {tempDiff.label}
                    </div>
                  )}
                </div>

                {/* Sunshine Card */}
                <div 
                  className="daily-stat-card sunshine-card clickable"
                  onClick={() => setShowSunshineModal(true)}
                  title="View sunshine details"
                >
                  <Sun size={20} className="stat-card-icon sunshine-icon" />
                  <div className="stat-card-value">
                    {stats.sunshineHours !== null ? stats.sunshineHours : '--'}
                    <span className="stat-card-unit">hrs</span>
                  </div>
                  <div className="stat-card-label">SUNSHINE</div>
                  {stats.sunshinePct !== null && (
                    <div className="stat-card-sub">{stats.sunshinePct}%</div>
                  )}
                </div>

                {/* Precipitation Card */}
                <div 
                  className="daily-stat-card precip-card clickable"
                  onClick={() => setShowPrecipModal(true)}
                  title="View precipitation details"
                >
                  <Droplets size={20} className="stat-card-icon precip-icon" />
                  <div className="stat-card-value">
                    {stats.totalPrecip !== null ? stats.totalPrecip.toFixed(2) : '--'}
                    <span className="stat-card-unit">"</span>
                  </div>
                  <div className="stat-card-label">PRECIP</div>
                </div>
              </div>

              {/* Stats Grid - Row 2 */}
              <div className="daily-summary-grid">
                {/* Cloud Cover Card */}
                <div 
                  className="daily-stat-card cloud-card clickable"
                  onClick={() => setShowCloudModal(true)}
                  title="View cloud cover details"
                >
                  <Cloud size={20} className="stat-card-icon cloud-icon" />
                  <div className="stat-card-value">
                    {stats.cloudCoverPct !== null ? stats.cloudCoverPct : '--'}
                    <span className="stat-card-unit">%</span>
                  </div>
                  <div className="stat-card-label">CLOUDS</div>
                </div>

                {/* Wind Card */}
                <div 
                  className="daily-stat-card wind-card clickable"
                  onClick={() => setShowWindModal(true)}
                  title="View wind details"
                >
                  <Wind size={20} className="stat-card-icon wind-icon" />
                  <div className="stat-card-value">
                    {stats.avgWind !== null ? Math.round(stats.avgWind) : '--'}
                    <span className="stat-card-unit">mph</span>
                  </div>
                  <div className="stat-card-label">AVG WIND</div>
                  {stats.maxGust !== null && stats.maxGust > 0 && (
                    <div className="stat-card-sub">Gust {Math.round(stats.maxGust)}</div>
                  )}
                </div>

                {/* Humidity Card */}
                <div 
                  className="daily-stat-card humidity-card clickable"
                  onClick={() => setShowHumidityModal(true)}
                  title="View humidity details"
                >
                  <FaThermometerHalf size={18} className="stat-card-icon humidity-icon" />
                  <div className="stat-card-value">
                    {stats.avgHumidity !== null ? Math.round(stats.avgHumidity) : '--'}
                    <span className="stat-card-unit">%</span>
                  </div>
                  <div className="stat-card-label">HUMIDITY</div>
                </div>
              </div>

              {/* Tap hint */}
              <div className="daily-summary-hint">
                Tap any card for hourly details
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sub-modals - pass the specific date */}
      <SunshineModal
        stationId={stationId}
        stationName={stationName}
        darkMode={darkMode}
        isOpen={showSunshineModal}
        onClose={() => setShowSunshineModal(false)}
        sunTimes={sunTimes}
        filterDate={dayData.date}
      />

      <CloudCoverModal
        stationId={stationId}
        stationName={stationName}
        darkMode={darkMode}
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        filterDate={dayData.date}
      />

      <WindModal
        stationId={stationId}
        stationName={stationName}
        darkMode={darkMode}
        isOpen={showWindModal}
        onClose={() => setShowWindModal(false)}
        filterDate={dayData.date}
      />

      <HumidityModal
        stationId={stationId}
        stationName={stationName}
        darkMode={darkMode}
        isOpen={showHumidityModal}
        onClose={() => setShowHumidityModal(false)}
        filterDate={dayData.date}
      />

      <DewPointModal
        stationId={stationId}
        stationName={stationName}
        darkMode={darkMode}
        isOpen={showDewPointModal}
        onClose={() => setShowDewPointModal(false)}
        filterDate={dayData.date}
      />

      <HourlyPrecipModal
        stationId={stationId}
        stationName={stationName}
        darkMode={darkMode}
        isOpen={showPrecipModal}
        onClose={() => setShowPrecipModal(false)}
        filterDate={dayData.date}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}