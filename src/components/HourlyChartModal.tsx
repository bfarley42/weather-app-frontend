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
}: HourlyChartModalProps) {
  const [hourlyData, setHourlyData] = useState<HourlyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('1D');
  const [chartReady, setChartReady] = useState(false);

  // Get hours from current range
  const hours = rangeToHours[dateRange] || 24;

  // Fetch data when modal opens or range changes
  useEffect(() => {
    if (!isOpen || !stationId) return;

    async function fetchHourlyData() {
      setLoading(true);
      setChartReady(false);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=${hours}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch hourly data: ${response.status}`);
        }

        const data = await response.json();
        setHourlyData(data);
        
        // Delay chart render to let modal animation complete
        setTimeout(() => setChartReady(true), 150);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hourly data');
      } finally {
        setLoading(false);
      }
    }

    fetchHourlyData();
  }, [isOpen, stationId, hours]);

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
              <button onClick={() => setDateRange(dateRange)}>Retry</button>
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
            />
          )}
        </div>
      </div>
    </div>
  );

  // Render via portal to document.body
  return createPortal(modalContent, document.body);
}