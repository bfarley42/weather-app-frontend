// src/components/HourlyPrecipModal.tsx
/**
 * Modal for displaying 24-hour precipitation chart
 * Triggered by clicking the Precip stat in Card 2 of StationSummaryCard
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import HourlyPrecipChart from './HourlyPrecipChart';
import { API_URL } from '../config';
import { fetchHistoricalPrecipitation, type HistoricalDay } from '../api/historicalDay';
import './HourlyPrecipModal.css';

interface HourlyPrecipData {
  ts_local: string;
  precip_in: number | null;
}

interface HourlyPrecipModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  totalPrecip24h?: number | null;
  filterDate?: string;  // NEW - optional date like "2026-02-08"
  historicalDay?: HistoricalDay;
}

export default function HourlyPrecipModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  totalPrecip24h,
  filterDate,
  historicalDay,
}: HourlyPrecipModalProps) {
  const [precipData, setPrecipData] = useState<HourlyPrecipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch hourly precip data when modal opens
  useEffect(() => {
    if (!isOpen || !stationId) return;
    const controller = new AbortController();

    async function fetchPrecipData() {
      setLoading(true);
      setError(null);

      try {
        if (filterDate) {
          const rows = await fetchHistoricalPrecipitation(stationId, filterDate, controller.signal);
          if (!controller.signal.aborted) setPrecipData(rows);
          return;
        }
      // Use date-specific endpoint if filterDate provided
      const url = filterDate
        ? `${API_URL}/api/weather/hourly-day?station=${stationId}&date=${filterDate}`
        : `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`;
      
      const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch precip data: ${response.status}`);
        }

        const data = await response.json();
        const precipData: HourlyPrecipData[] = data.map((d: HourlyPrecipData) => ({
          ts_local: d.ts_local,
          precip_in: d.precip_in,
        }));
        if (!controller.signal.aborted) setPrecipData(precipData);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load precipitation data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchPrecipData();
    return () => controller.abort();
  }, [isOpen, stationId, filterDate, attempt]);

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

  const modalContent = (
    <div 
      className={`precip-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="precip-modal">
        <button 
          className="precip-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="precip-modal-handle" />

        <div className="precip-modal-content">
          {loading ? (
            <div className="precip-modal-loading">
              <div className="loading-spinner" />
              <span>Loading precipitation data...</span>
            </div>
          ) : error ? (
            <div className="precip-modal-error">
              <span>⚠️ {error}</span>
              {filterDate && <button onClick={() => setAttempt(value => value + 1)}>Retry</button>}
            </div>
          ) : precipData.length === 0 ? (
            <div className="precip-modal-loading">
              <span>No precipitation data available</span>
            </div>
          ) : (
            <HourlyPrecipChart
              data={precipData}
              stationName={stationName}
              darkMode={darkMode}
              totalPrecip={totalPrecip24h}
              filterDate={filterDate}
              historicalDay={historicalDay}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
