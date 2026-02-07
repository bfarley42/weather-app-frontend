// src/components/HourlyPrecipModal.tsx
/**
 * Modal for displaying 24-hour precipitation chart
 * Triggered by clicking the Precip stat in Card 2 of StationSummaryCard
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import HourlyPrecipChart from './HourlyPrecipChart';
import { API_URL } from '../config';
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
}

export default function HourlyPrecipModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  totalPrecip24h,
}: HourlyPrecipModalProps) {
  const [precipData, setPrecipData] = useState<HourlyPrecipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch hourly precip data when modal opens
  useEffect(() => {
    if (!isOpen || !stationId) return;

    async function fetchPrecipData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/weather/hourly-hours?station=${stationId}&hours=24`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch precip data: ${response.status}`);
        }

        const data = await response.json();
        const precipData: HourlyPrecipData[] = data.map((d: any) => ({
          ts_local: d.ts_local,
          precip_in: d.precip_in,
        }));
        setPrecipData(precipData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load precipitation data');
      } finally {
        setLoading(false);
      }
    }

    fetchPrecipData();
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
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}