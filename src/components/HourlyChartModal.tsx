// src/components/HourlyChartModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import HourlyChartSimple from './HourlyChartSimple';
import { API_URL } from '../config';
import './HourlyChartModal.css';

interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  relh_pct: number | null;
  max_gust_mph: number | null;
  feelslike_f: number | null;
}

interface HourlyChartModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  filterDate?: string;  // NEW - optional date like "2026-02-08"
  timezone?: string;
}

// Map range labels to hours
const rangeToHours: Record<string, number> = {
  '1D': 24,
  '3D': 72,
  '7D': 168,
};

export default function HourlyChartModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  filterDate,
  timezone,
}: HourlyChartModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('1D');
  const [chartReady, setChartReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Get hours from current range
  const hours = rangeToHours[dateRange] || 24;

  // Fetch data when modal opens or range changes
  useEffect(() => {
    if (!isOpen || !stationId) return;
    const controller = new AbortController();

    async function fetchHourlyData() {
      setLoading(true);
      setChartReady(false);
      setError(null);

      try {
      // Use date-specific endpoint if filterDate provided
      const url = filterDate
        ? `${API_URL}/api/weather/hourly-day?station=${stationId}&date=${filterDate}`
        : `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`;
      
      const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch hourly data: ${response.status}`);
        }

        const data = await response.json();
        if (filterDate && data.some((hour: HourlyWeather) => hour.ts_local.slice(0, 10) !== filterDate)) {
          throw new Error('Hourly observations do not match the selected local date');
        }
        if (controller.signal.aborted) return;
        setHourlyData(data);
        
        // Delay chart render to let modal animation complete
        setTimeout(() => { if (!controller.signal.aborted) setChartReady(true); }, 150);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load hourly data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchHourlyData();
    return () => controller.abort();
  }, [isOpen, stationId, hours, filterDate, attempt]);

  // Reset to 1D when modal opens
  useEffect(() => {
    if (isOpen) {
      setDateRange('1D');
    } else {
      setChartReady(false);
    }
  }, [isOpen]);

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

  // Handle date range change from chart
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
  };

  // Don't render if not open
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={`hourly-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hourly-modal">
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
          {loading ? (
            <div className="hourly-modal-loading">
              <div className="loading-spinner" />
              <span>Loading hourly data...</span>
            </div>
          ) : error ? (
            <div className="hourly-modal-error">
              <span>⚠️ {error}</span>
              <button onClick={() => setAttempt(value => value + 1)}>Retry</button>
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="hourly-modal-loading">
              <span>No hourly data available</span>
            </div>
          ) : !chartReady ? (
            <div className="hourly-modal-loading">
              <div className="loading-spinner" />
              <span>Preparing chart...</span>
            </div>
          ) : (
            <HourlyChartSimple
              data={hourlyData}
              stationId={stationId}
              stationName={stationName}
              darkMode={darkMode}
              onDateRangeChange={handleDateRangeChange}
              initialRange={dateRange}
              filterDate={filterDate}
              timezone={timezone}
            />
          )}
        </div>
      </div>
    </div>
  );

  // Render via portal to document.body
  return createPortal(modalContent, document.body);
}
