// src/components/ConditionHistoryModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_URL } from '../config';
import './HourlyChartModal.css'; // Reuse the modal styling

interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  skyc1: string | null;
  wxcodes: string | null;
}

interface ConditionHistoryModalProps {
  stationId: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  getWeatherIcon: (skyCode: string | null, wxCode: string | null, size: number, isDay: boolean, className?: string) => React.ReactNode;
  sunTimes?: { sunrise: string | null; sunset: string | null; is_day: boolean } | null;
}

// Helper to determine if hour is daytime based on timestamp
function isHourDaytime(
  date: Date,
  sunrise: string | null,
  sunset: string | null
): boolean {
  if (!sunrise || !sunset) return true;

  const hour = date.getHours() + date.getMinutes() / 60;

  // Parse sunrise/sunset times (format: "HH:MM")
  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  const sunriseHour = parseTime(sunrise);
  const sunsetHour = parseTime(sunset);

  return hour >= sunriseHour && hour < sunsetHour;
}

// Helper to get condition text from sky_code
function getConditionText(skyCode: string | null, wxCode: string | null): string {
  if (wxCode) {
    const wx = wxCode.toLowerCase();
    if (wx.includes('tsra') || wx.includes('tstm')) return 'Thunderstorm';
    if (wx.includes('fzra')) return 'Freezing Rain';
    if (wx.includes('ra') || wx.includes('rain') || wx.includes('shwr')) return 'Rain';
    if (wx.includes('sn') || wx.includes('snow')) return 'Snow';
    if (wx.includes('fg') || wx.includes('fog')) return 'Fog';
    if (wx.includes('hz') || wx.includes('haze')) return 'Haze';
    if (wx.includes('br') || wx.includes('mist')) return 'Mist';
    if (wx.includes('dz') || wx.includes('drizzle')) return 'Drizzle';
    if (wx.includes('pl') || wx.includes('sleet') || wx.includes('ice')) return 'Sleet';
  }

  if (skyCode) {
    const sky = skyCode.toLowerCase();
    if (sky.includes('clr') || sky.includes('clear') || sky === 'skc') return 'Clear';
    if (sky.includes('few')) return 'Few Clouds';
    if (sky.includes('sct') || sky.includes('scattered')) return 'Partly Cloudy';
    if (sky.includes('bkn') || sky.includes('broken')) return 'Mostly Cloudy';
    if (sky.includes('ovc') || sky.includes('overcast')) return 'Overcast';
    if (sky.includes('cloud')) return 'Cloudy';
  }

  return '--';
}

// Helper to format time from ISO string
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hour = date.getHours();
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${ampm}`;
}

export default function ConditionHistoryModal({
  stationId,
  darkMode = false,
  isOpen,
  onClose,
  getWeatherIcon,
  sunTimes,
}: ConditionHistoryModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch hourly data when modal opens
  useEffect(() => {
    if (!isOpen || !stationId) return;

    async function fetchHourlyData() {
      setLoading(true);
      setError(null);

      // Calculate date range for last 24 hours
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 1);

      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      try {
        const response = await fetch(
          `${API_URL}/api/weather/hourly?station=${stationId}&start=${formatDate(start)}&end=${formatDate(end)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch hourly data: ${response.status}`);
        }

        const data = await response.json();
        setHourlyData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hourly data');
      } finally {
        setLoading(false);
      }
    }

    fetchHourlyData();
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

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Reverse to show most recent first (descending order)
  const sortedData = [...hourlyData].reverse();

  const modalContent = (
    <div
      className={`hourly-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hourly-modal" style={{ maxWidth: '500px' }}>
        {/* Close Button */}
        <button
          className="hourly-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Handle */}
        <div className="hourly-modal-handle" />

        {/* Content */}
        <div className="hourly-modal-content">
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: darkMode ? '#e2e8f0' : '#1e293b',
            textAlign: 'center'
          }}>
            24-Hour Conditions
          </h3>

          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              Loading...
            </div>
          ) : error ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#ef4444'
            }}>
              {error}
            </div>
          ) : sortedData.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              No data available
            </div>
          ) : (
            /* Table */
            <div style={{
              maxHeight: '60vh',
              overflowY: 'auto',
              borderRadius: '8px',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem'
              }}>
                <thead>
                  <tr style={{
                    background: darkMode ? '#1e293b' : '#f1f5f9',
                    position: 'sticky',
                    top: 0
                  }}>
                    <th style={{
                      padding: '10px 8px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: darkMode ? '#94a3b8' : '#64748b',
                      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                    }}>Time</th>
                    <th style={{
                      padding: '10px 4px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: darkMode ? '#94a3b8' : '#64748b',
                      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                    }}></th>
                    <th style={{
                      padding: '10px 8px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: darkMode ? '#94a3b8' : '#64748b',
                      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                    }}>Condition</th>
                    <th style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: darkMode ? '#94a3b8' : '#64748b',
                      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                    }}>Temp</th>
                    <th style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: darkMode ? '#94a3b8' : '#64748b',
                      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                    }}>Precip</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((hour, index) => {
                    const date = new Date(hour.ts_local);
                    const isDay = isHourDaytime(
                      date,
                      sunTimes?.sunrise ?? null,
                      sunTimes?.sunset ?? null
                    );

                    return (
                      <tr
                        key={index}
                        style={{
                          background: index % 2 === 0
                            ? (darkMode ? '#0f172a' : '#ffffff')
                            : (darkMode ? '#1e293b' : '#f8fafc'),
                          borderBottom: `1px solid ${darkMode ? '#1e293b' : '#f1f5f9'}`
                        }}
                      >
                        <td style={{
                          padding: '8px',
                          color: darkMode ? '#e2e8f0' : '#1e293b',
                          fontWeight: 500
                        }}>
                          {formatTime(hour.ts_local)}
                        </td>
                        <td style={{
                          padding: '8px 4px',
                          textAlign: 'center'
                        }}>
                          {getWeatherIcon(hour.skyc1, hour.wxcodes, 20, isDay, "hourly-icon")}
                        </td>
                        <td style={{
                          padding: '8px',
                          color: darkMode ? '#cbd5e1' : '#475569'
                        }}>
                          {getConditionText(hour.skyc1, hour.wxcodes)}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: darkMode ? '#e2e8f0' : '#1e293b',
                          fontWeight: 500
                        }}>
                          {hour.tmpf !== null ? `${Math.round(hour.tmpf)}°` : '--'}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: hour.precip_in && hour.precip_in > 0
                            ? (darkMode ? '#60a5fa' : '#3b82f6')
                            : (darkMode ? '#94a3b8' : '#64748b')
                        }}>
                          {hour.precip_in !== null
                            ? `${hour.precip_in.toFixed(2)}"`
                            : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
