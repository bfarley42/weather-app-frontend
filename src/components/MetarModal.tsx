// src/components/MetarModal.tsx
/**
 * Modal wrapper for displaying METAR observation details
 * Uses React Portal to render at document root
 * 
 * Data is passed from parent (StationSummaryCard) via initialData prop
 * to ensure consistency between the card display and modal display.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import MetarSummary from './MetarSummary';
import './MetarModal.css';

export interface MetarData {
  station_id: string;
  observed_at: string | null;
  metar_raw: string | null;
  temp_f: number | null;
  dewpoint_f: number | null;
  humidity_pct: number | null;
  pressure_in: number | null;
  pressure_trend: string | null;
  wind_speed_mph: number | null;
  wind_gust_mph: number | null;
  wind_direction_deg: number | null;
  sky_code: string | null;
  wx_code: string | null;
  visibility_mi: number | null;
  precip_in: number | null;
}

interface MetarModalProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  isDay?: boolean;
  initialData?: {
    station_id?: string;
    observed_at?: string | null;
    metar_raw?: string | null;
    temp_f?: number | null;
    dewpoint_f?: number | null;
    humidity_pct?: number | null;
    pressure_in?: number | null;
    pressure_trend?: string | null;
    wind_speed_mph?: number | null;
    wind_gust_mph?: number | null;
    wind_direction_deg?: number | null;
    sky_code?: string | null;
    wx_code?: string | null;
    visibility_mi?: number | null;
    precip_in?: number | null;
  };
}

export default function MetarModal({
  stationId,
  stationName,
  darkMode = false,
  isOpen,
  onClose,
  isDay = true,
  initialData,
}: MetarModalProps) {
  
  // Convert initialData to MetarData format
  // No API fetch needed - data comes from parent's current-summary response
  const metarData: MetarData | null = initialData ? {
    station_id: initialData.station_id ?? stationId,
    observed_at: initialData.observed_at ?? null,
    metar_raw: initialData.metar_raw ?? null,
    temp_f: initialData.temp_f ?? null,
    dewpoint_f: initialData.dewpoint_f ?? null,
    humidity_pct: initialData.humidity_pct ?? null,
    pressure_in: initialData.pressure_in ?? null,
    pressure_trend: initialData.pressure_trend ?? null,
    wind_speed_mph: initialData.wind_speed_mph ?? null,
    wind_gust_mph: initialData.wind_gust_mph ?? null,
    wind_direction_deg: initialData.wind_direction_deg ?? null,
    sky_code: initialData.sky_code ?? null,
    wx_code: initialData.wx_code ?? null,
    visibility_mi: initialData.visibility_mi ?? null,
    precip_in: initialData.precip_in ?? null,
  } : null;

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

  // Don't render if not open
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={`metar-modal-overlay ${darkMode ? 'dark' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="metar-modal">
        {/* Close Button */}
        <button 
          className="metar-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Handle */}
        <div className="metar-modal-handle" />

        {/* Content */}
        <div className="metar-modal-content">
          {metarData ? (
            <MetarSummary
              data={metarData}
              stationName={stationName}
              darkMode={darkMode}
              isDay={isDay}
            />
          ) : (
            <div className="metar-modal-loading">
              <span>No observation data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render via portal to document.body
  return createPortal(modalContent, document.body);
}