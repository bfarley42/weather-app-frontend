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
  const [dateRange, setDateRange] = useState('1D');  // Default to 1D
  const [chartReady, setChartReady] = useState(false);

  // Calculate date range
  const getDateRange = (range: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '1D': start.setDate(start.getDate() - 1); break;
      case '3D': start.setDate(start.getDate() - 3); break;
      case '7D': start.setDate(start.getDate() - 7); break;
      default: start.setDate(start.getDate() - 1);  // Default 1D
    }
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
    };
  };

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch data when modal opens or date range changes
  useEffect(() => {
    if (!isOpen || !stationId) return;

    async function fetchHourlyData() {
      setLoading(true);
      setChartReady(false);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/weather/hourly?station=${stationId}&start=${startDate}&end=${endDate}`
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
  }, [isOpen, stationId, startDate, endDate]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
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
              stationName={stationName}
              darkMode={darkMode}
              startDate={startDate}
              endDate={endDate}
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